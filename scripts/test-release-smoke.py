"""Exercise the exact SDK/test artifact without rewriting its licence constant.
Only the host and dataset are simulated. Does not constitute a full UI suite,
real Power BI validation or a Microsoft licence purchase/assignment test.
Requires Python Playwright + Chromium. Supply a package path or SDK_BUILD_REPORT.
"""
from pathlib import Path
import hashlib, json, os, subprocess, sys, tempfile, zipfile
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parent.parent
if len(sys.argv) > 2:
    sys.exit('Usage: python scripts/test-release-smoke.py [exact-package.pbiviz]')
if len(sys.argv) == 2:
    PKG = Path(sys.argv[1]).resolve()
else:
    build = json.loads((ROOT / 'dist/SDK_BUILD_REPORT.json').read_text())
    filename = build['finalFile']
    if Path(filename).name != filename:
        raise ValueError('Invalid final package basename')
    PKG = ROOT / 'dist' / filename
    if hashlib.sha256(PKG.read_bytes()).hexdigest() != build['finalSHA256']:
        raise ValueError('Package does not match final SDK build report')
OUT = ROOT / 'build-logs/package-smoke'
OUT.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(PKG) as archive:
    if archive.testzip() is not None:
        raise ValueError('Invalid archive CRC')
    outer = json.loads(archive.read('package.json'))
    source = next(r['file'] for r in outer['resources'] if r['sourceType'] == 5)
    inner = json.loads(archive.read(source))
    if inner['visual']['version'] != outer['visual']['version']:
        raise ValueError('Inner/outer version mismatch')
plan = json.loads((ROOT / 'config/licensing.json').read_text())['servicePlanId']
checks, errors, requests = [], [], []
report = {'package': PKG.name, 'sha256': hashlib.sha256(PKG.read_bytes()).hexdigest(),
          'passed': checks, 'runtimeErrors': errors, 'requests': requests,
          'modifiedPackageCode': False, 'realPowerBiTest': False, 'realLicenceAssignment': False,
          'licensedHostFixtureConfigured': bool(plan), 'status': 'running'}
def save():
    (OUT / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
def check(name, condition):
    if not condition:
        raise AssertionError(name)
    checks.append(name)
    print('PASS', name, flush=True)
    save()
try:
    with tempfile.TemporaryDirectory(prefix='filter-search-smoke-') as temporary, sync_playwright() as pw:
        chromium = os.environ.get('FF_CHROMIUM') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None)
        browser = pw.chromium.launch(executable_path=chromium, headless=True,
                                     args=['--no-sandbox', '--disable-dev-shm-usage'])
        for licence_mode in (['unlicensed', 'licensed-simulated'] if plan else ['unconfigured']):
            env = dict(os.environ)
            for name in ['FF_LICENSE_TEST_PLAN_ID', 'FF_LICENSE_HOST_PLAN_ID', 'FF_LICENSE_BOOT']:
                env.pop(name, None)
            if licence_mode == 'licensed-simulated':
                env['FF_LICENSE_HOST_PLAN_ID'] = plan
            html = Path(temporary) / 'smoke.html'
            subprocess.run([sys.executable, str(ROOT / 'scripts/make-search-date-harness.py'), str(PKG), str(html)],
                           env=env, check=True, capture_output=True, timeout=30)
            page = browser.new_page(timezone_id='Europe/Amsterdam', viewport={'width': 1000, 'height': 650})
            page.set_default_timeout(4000)
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
            page.on('request', lambda request: requests.append(request.url) if request.url.startswith(('http:', 'https:')) else None)
            page.set_content(html.read_text())
            frame = page.frame_locator('#visualFrame')
            query = frame.locator('.ff-query')
            query.wait_for()
            real_frame = page.locator('#visualFrame').element_handle().content_frame()
            execute = real_frame.evaluate
            page.wait_for_timeout(120)
            check(licence_mode + ': package renders in sandbox', page.locator('#visualFrame').get_attribute('sandbox') == 'allow-scripts')
            query.fill('ST'); page.wait_for_timeout(520)
            query.press_sequentially('RALA'); page.wait_for_timeout(650)
            check(licence_mode + ': two-letter pause preserves typed text', query.input_value() == 'STRALA')
            check(licence_mode + ': accent-insensitive OR matches both columns', execute('ffTest.filter?.values') == [60637328, 60637329])
            execute('ffTest.delay=500')
            query.fill('BI'); page.wait_for_timeout(420)
            query.fill('BILLY'); page.wait_for_timeout(1100)
            check(licence_mode + ': delayed host echo preserves draft', query.input_value() == 'BILLY')
            check(licence_mode + ': free search remains available', execute('ffTest.filter?.values') == [60637329, 60637330, 60637331, 60637334])
            execute('ffTest.delay=0')
            query.fill('not-a-matching-record'); query.press('Enter'); page.wait_for_timeout(100)
            check(licence_mode + ': no results retain input and filter to zero', query.input_value() == 'not-a-matching-record' and execute('ffTest.filter?.logicalOperator') == 'And' and execute('ffTest.filter?.conditions') == [{'operator':'IsBlank'},{'operator':'IsNotBlank'}])
            frame.locator('.ff-clear-text').click(); page.wait_for_timeout(100)
            check(licence_mode + ': clear removes the owned filter', execute('ffTest.filter') is None and query.input_value() == '')
            frame.locator('[data-ff-chip="date"]').click(); page.wait_for_timeout(100)
            if licence_mode != 'licensed-simulated':
                expected_state = 'unlicensed' if plan else 'unconfigured'
                check(licence_mode + ': paid date entry stays blocked', frame.locator('.ff-step-input').count() == 0 and execute('ffTest.visual.dateLicence.state') == expected_state)
                check(licence_mode + ': no incorrect purchase banner', (execute('ffTest.licenceNotifications.length') > 0) if plan else execute('ffTest.licenceNotifications.length') == 0)
            else:
                check('Simulated assigned plan: date editor opens', frame.locator('.ff-step-input').count() == 1)
                frame.locator('.ff-step-input').fill('8 Oct 2026')
                real_frame.get_by_role('button', name='Apply', exact=True).click(); page.wait_for_timeout(100)
                check('Simulated assigned plan: date-only filter', execute('ffTest.filter?.values') == [60637328, 60637329])
            check(licence_mode + ': no automatic focus or shared format writes', execute('ffTest.focusCalls.length') == 0 and execute('ffTest.persistCalls') == 0)
            page.locator('#visualFrame').screenshot(path=str(OUT / (licence_mode + '.png')))
            page.close()
        browser.close()
    check('No runtime console errors in smoke cases', not errors)
    check('No direct application network requests in smoke cases', not requests)
    report['status'] = 'passed'
except Exception as error:
    report['status'] = 'failed'; report['error'] = str(error)
    raise
finally:
    report['checks'] = len(checks); save()
