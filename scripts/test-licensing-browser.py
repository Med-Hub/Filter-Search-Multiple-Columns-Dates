"""0.6.0 licensing integration checks. Two explicitly separated cases:
1) exact shipped unconfigured package; 2) in-memory configured fixture of that
code with a synthetic Service ID plus a simulated native licenseManager.
No paid-enabled .pbiviz is written or delivered. Real Microsoft purchase,
assignment, tenant policies and Desktop/Service must be tested separately.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import datetime, hashlib, json, os, subprocess, sys, tempfile
ROOT=Path(__file__).resolve().parent.parent
VERSION=json.loads((ROOT/'package.json').read_text())['version']
OUT=ROOT/f'docs/qa/{VERSION}';OUT.mkdir(exist_ok=True,parents=True)
PKG=ROOT/f'dist/Filter_Search_{VERSION}_Licensing_Test.pbiviz'
ID='a156a7d4-9cc6-4b37-8e66-8495823f13b7'
checks=[];errors=[];requests=[];page=None

def check(name,value):
    if not value: raise AssertionError(name)
    checks.append(name);print('PASS '+name,flush=True)

def generate(folder,fixture,boot):
    env=os.environ.copy();env.pop('FF_LICENSE_TEST_PLAN_ID',None)
    if fixture:env['FF_LICENSE_TEST_PLAN_ID']=ID
    env['FF_LICENSE_BOOT']=boot
    html=Path(folder)/'licence-test.html'
    subprocess.run([sys.executable,str(ROOT/'scripts/make-search-date-harness.py'),str(PKG),str(html)],env=env,cwd=ROOT,check=True,stdout=subprocess.DEVNULL)
    return html.read_text()

with tempfile.TemporaryDirectory() as folder, sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    def setup(fixture=True,boot='',height=76,wait=80):
        global page
        if page:page.close()
        page=browser.new_page(viewport={'width':1000,'height':600},timezone_id='Europe/Amsterdam');page.set_default_timeout(2000)
        page.clock.set_system_time(datetime.datetime(2026,10,7,12,tzinfo=datetime.timezone.utc))
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:requests.append(r.url) if r.url.startswith(('http:','https:')) else None)
        page.set_content(generate(folder,fixture,boot));u('.ff-query').wait_for()
        if height!=76:
            page.locator('#visualFrame').evaluate('(e,h)=>e.style.height=h+"px"',height)
            run(f'ffTest.resize(600,{height})')
        tick(wait)
    def frame():return page.locator('#visualFrame').element_handle().content_frame()
    def u(sel):return frame().locator(sel)
    def run(js):return frame().evaluate(js)
    def tick(ms=80):page.wait_for_timeout(ms)
    def date():u('[data-ff-chip="date"]').click();tick(20)
    def search(text):u('.ff-query').fill(text);u('.ff-query').press('Enter');tick(30)
    def keys():return run('ffTest.filter?.values||[]')
    def mode():return u('.ff-row-options').first.get_attribute('data-ff-mode')
    query="{text:'STRALA',fieldIds:ffTest.visual.fields.map(f=>f.id),mode:'contains',logic:'any',ignoreAccents:true,date:{fieldId:ffTest.visual.dateFields[0].id,condition:'on',from:'2026-10-08'}}"

    # Exact delivered artifact. It intentionally cannot grant dates without a Service ID.
    setup(False)
    check('Exact package: release marker and unchanged two-row layout',u('[data-ff-release]').get_attribute('data-ff-release')==VERSION and u('[data-ff-layout]').get_attribute('data-ff-layout')=='two-rows')
    check('Exact package: configuration is explicitly unconfigured',run('ffTest.visual.dateLicence.state')=='unconfigured')
    check('Exact package: no needless licensing lookup with an empty Service ID',run('ffTest.licenceCalls')==0)
    search('STRALA');check('Exact package: free accent-insensitive multi-column search works',keys()==[60637328,60637329])
    before=run('ffTest.calls.length');date();check('Exact package: Date stays locked without erasing search',mode()=='summary' and u('.ff-query').input_value()=='STRALA' and run('ffTest.calls.length')==before)
    check('Exact package: no false purchase banner for an unconfigured offer',run('ffTest.licenceNotifications.length')==0)
    check('Exact package: caller cannot bypass gate by calling apply directly',run(f'ffTest.visual.apply({query})') is False and run('ffTest.calls.length')==before)
    check('Exact package: controller guard also blocks direct date submission',run(f'(()=>{{try{{ffTest.visual.controller.submit({query});return false;}}catch(e){{return e.code==="date-licence";}}}})()') is True)
    u('.ff-clear-text').click();tick();check('Exact package: Clear still works',run('ffTest.filter') is None and u('.ff-query').input_value()=='')
    page.locator('#visualFrame').screenshot(path=str(OUT/'exact-package-free-layout.png'))
    setup(False,height=40);u('[aria-label="Filter by date"]').click();check('Exact package: date button in one-row layout is also gated',u('.ff-step-input').count()==0 and u('.ff-query').count()==1)

    # Configured in-memory fixture: only the ID constant differs; native host is simulated.
    for label,state,allowed in [('active',1,True),('warning',2,True),('inactive',0,False),('suspended',3,False),('unknown',4,False)]:
        setup(boot=f'ffTest.licenceState.plans[0].state={state};')
        check(f'{label}: one lookup per instance',run('ffTest.licenceCalls')==1)
        check(f'{label}: entitlement decision',run('ffTest.visual.dateLicence.allowed')==allowed)
        search('STRALA');date()
        if allowed:
            check(f'{label}: date editor unlocks',mode()=='date')
            u('.ff-step-input').fill('8 Oct 2026');frame().get_by_role('button',name='Apply',exact=True).click();tick()
            check(f'{label}: text and date combine',keys()==[60637328,60637329] and run('ffTest.visual.controller.applied.date.from')=='2026-10-08')
            u('.ff-clear-text').click();tick();check(f'{label}: Clear text retains date',run('ffTest.visual.controller.applied.text')=='' and run('ffTest.visual.controller.applied.date.from')=='2026-10-08')
            u('[aria-label="Clear date filter"]').first.click();tick();check(f'{label}: Clear date removes remaining filter',run('ffTest.filter') is None)
            check(f'{label}: native paywall not shown',run('ffTest.licenceNotifications.length')==0)
        else:
            check(f'{label}: paid editor stays closed and free result remains',mode()=='summary' and keys()==[60637328,60637329])
            check(f'{label}: correct native feature banner is requested',run('ffTest.licenceNotifications.length')==1 and 'Date Filter Pro' in run('ffTest.licenceNotifications[0]'))
            date();check(f'{label}: repeat click does not flood banners',run('ffTest.licenceNotifications.length')==1)
            before=run('ffTest.calls.length');check(f'{label}: direct apply denied',run(f'ffTest.visual.apply({query})') is False and run('ffTest.calls.length')==before)
            run(f'ffTest.visual.retry({query})');check(f'{label}: refresh cannot queue a paid bypass',run('ffTest.visual.pendingQuery') is None and run('ffTest.calls.length')==before)
            search('BILLY');check(f'{label}: another free query remains functional',keys()==[60637329,60637330,60637331,60637334])
            u('.ff-clear-text').click();tick();check(f'{label}: reset remains functional',run('ffTest.filter') is None)
        for _ in range(3):run('ffTest.send()')
        check(f'{label}: typing and updates do not refetch session licence',run('ffTest.licenceCalls')==1)

    cases=[('other-plan',"T.licenceState.plans[0].spIdentifier='another-plan';",'unlicensed'),
           ('not-signed-in','T.licenceState.isLicenseInfoAvailable=false;','unavailable'),
           ('unsupported','T.licenceState.isLicenseUnsupportedEnv=true;','unsupported'),
           ('missing-manager','T.licenceManagerMissing=true;','unsupported'),
           ('lookup-rejects','T.licenceFailure=true;','unavailable'),
           ('bad-response','T.licenceState=null;','unavailable'),
           ('malformed-flags',"T.licenceState.isLicenseInfoAvailable='true';",'unavailable')]
    for name,boot,state in cases:
        setup(boot=boot);search('STRALA');before=run('ffTest.calls.length');date()
        check(f'{name}: state is {state}, not a guessed entitlement',run('ffTest.visual.dateLicence.state')==state)
        check(f'{name}: no paid filter and no loss of text',run('ffTest.calls.length')==before and u('.ff-query').input_value()=='STRALA' and keys()==[60637328,60637329])
        check(f'{name}: no incorrect buy banner for verification errors',run('ffTest.licenceNotifications.length')==(1 if state=='unlicensed' else 0))
        u('.ff-clear-text').click();tick();check(f'{name}: clear available',run('ffTest.filter') is None)

    setup(boot='T.licenceDelay=1100;',wait=10)
    u('.ff-query').fill('ST');u('.ff-query').press('Enter');date()
    check('Pending licence: free typing works and date stays closed',u('.ff-query').input_value()=='ST' and mode()=='summary')
    u('.ff-query').fill('STRALA');u('.ff-query').evaluate('(e)=>e.setSelectionRange(2,2)');tick(1200)
    check('Late licence success: draft text and caret are not overwritten',u('.ff-query').input_value()=='STRALA' and u('.ff-query').evaluate('(e)=>e.selectionStart')==2)
    check('Late licence success: no date condition is automatically applied',run('ffTest.visual.controller.applied?.date||null') is None)
    date();check('Late licence success: explicit next click opens dates',mode()=='date')

    setup(boot='T.licenceDelay=600;T.licenceState.plans=[];',wait=10);run('ffTest.visual.destroy()');tick(750)
    check('Destroyed visual: late licence response does not render again',u('.ff-query').count()==0 and run('ffTest.calls.length')==0)

    setup(boot='T.locale="nl-NL";T.licenceState.plans=[];');date()
    check('Native licence tooltip follows Dutch locale','licentie' in run('ffTest.licenceNotifications[0]'))
    setup(boot='T.licenceState.plans=[];T.licenceNotificationFails=true;');search('BILLY');date();tick()
    check('Native banner failure never blocks free search',keys()==[60637329,60637330,60637331,60637334] and mode()=='summary')
    # Saved key filter has no query provenance in the inherited version. Keep,
    # label as Saved filter and allow clearing, rather than inventing a date.
    setup(boot='T.licenceState.plans=[];')
    run("ffTest.filter={$schema:'https://powerbi.com/product/schema#basic',filterType:1,target:{table:'Articles',column:'Article No'},operator:'In',values:[60637328]};ffTest.send();")
    check('Restored legacy filter is not treated as a licence',run('ffTest.visual.dateLicence.allowed') is False)
    check('Restored legacy filter remains visibly clearable',u('[aria-label="Clear all FieldFind filters"]').count()>0 or 'Saved filter' in u('body').inner_text())
    run('ffTest.visual.clear()');check('Restored legacy filter can be cleared without paying',run('ffTest.filter') is None)
    check('No dialog/focus-mode/appearance-write workaround',run('ffTest.modalCalls')==0 and run('ffTest.focusCalls.length')==0 and run('ffTest.persistCalls')==0)
    check('No browser runtime errors',not errors)
    check('No direct application network requests',not requests)
    report={'version':VERSION,'packageSha256':hashlib.sha256(PKG.read_bytes()).hexdigest(),'checks':len(checks),'passed':checks,'runtimeErrors':errors,'requests':requests,
            'exactDeliveredArtifact':'Unconfigured Service ID path exercised without modifying .pbiviz JavaScript.',
            'configuredFixture':'Other licence states use ONLY in-memory replacement of the empty ID, plus mocked licenseManager. No licensed customer package was created.',
            'realMicrosoftOrPowerBiTest':False}
    (OUT/'licensing-browser-results.json').write_text(json.dumps(report,indent=2)+'\n')
    print(f'COMPLETE {len(checks)} checks');browser.close()
