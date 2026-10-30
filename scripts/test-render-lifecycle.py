"""Exercise the delivered application lifecycle; injected renderer/host faults
are test fixtures. This is not a Power BI export test or certification."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, os
ROOT=Path(__file__).resolve().parent.parent
VERSION=json.loads((ROOT/'package.json').read_text())['version']
OUT=ROOT/'docs'/'qa'/VERSION
HTML=(ROOT/'preview'/f'FieldFind_Search_Date_{VERSION}.html').read_text()
checks=[];errors=[]
def check(name,ok):
    if not ok:raise AssertionError(name)
    checks.append(name);print('PASS '+name,flush=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('FF_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=None
    def setup():
        global page
        if page: page.close()
        page=browser.new_page(viewport={'width':1100,'height':650});page.set_default_timeout(2500)
        page.set_content(HTML)
        f=page.locator('#visualFrame').element_handle().content_frame();f.locator('.ff-query').wait_for();page.wait_for_timeout(100)
        f.evaluate('''()=>{const v=ffTest.visual;window.observed=[];window.rawRender=v.render.bind(v);v.host.eventService.renderingStarted=o=>observed.push(['start',o.type]);v.host.eventService.renderingFinished=o=>observed.push(['finish',o.type]);v.host.eventService.renderingFailed=(o,r)=>observed.push(['fail',o.type,r]);}''')
        return f
    f=setup();f.evaluate('ffTest.send()')
    check('Packaged normal update starts and finishes once',f.evaluate('observed.map(x=>x[0]).join()')=='start,finish')
    check('Normal update leaves no pending export render',f.evaluate('ffTest.visual.rendering.pendingCount')==0)
    f=setup();f.evaluate('''()=>{window.renderCalls=0;ffTest.visual.render=()=>{renderCalls++;throw new Error('injected renderer')};ffTest.send();}''')
    check('Actual packaged update reports renderer failure',f.evaluate('observed.map(x=>x[0]).join()')=='start,fail')
    check('Actual packaged update does not retry a throwing renderer',f.evaluate('renderCalls')==1)
    check('Failure message does not expose the exception or model data',f.evaluate('observed[1][2]')=='The visual could not complete rendering.')
    f=setup();f.evaluate('''()=>{ffTest.visual.render=(done,fail)=>{window.commitRender=done;window.failRender=fail};ffTest.send();}''')
    check('Async update is not announced as finished before commit',f.evaluate('observed.map(x=>x[0]).join()')=='start')
    f.evaluate('commitRender();commitRender();failRender();')
    check('Double commit and late failure deliver one terminal event',f.evaluate('observed.map(x=>x[0]).join()')=='start,finish')
    f=setup();f.evaluate('''()=>{ffTest.visual.render=(done,fail)=>{window.commitRender=done;window.failRender=fail};ffTest.send();failRender();commitRender();}''')
    check('A late commit cannot reverse a failed frame',f.evaluate('observed.map(x=>x[0]).join()')=='start,fail')
    f=setup();f.evaluate('''()=>{ffTest.visual.render=(done)=>{window.commitRender=done};ffTest.send();ffTest.visual.destroy();commitRender();}''')
    check('Destroy aborts an uncommitted frame exactly once',f.evaluate('observed.map(x=>x[0]).join()')=='start,fail')
    f=setup();f.evaluate('''()=>{window.commits=[];ffTest.visual.render=(done)=>commits.push(done);ffTest.send();ffTest.send();commits[1]();commits[0]();}''')
    check('Two pending updates each receive one completion',f.evaluate('observed.map(x=>x[0]).join()')=='start,start,finish,finish')
    f=setup();f.evaluate('''()=>{ffTest.visual.formattingService.buildFormattingModel=()=>{throw Error('injected')};window.cards=ffTest.visual.getFormattingModel().cards;}''')
    check('Format pane failure returns an empty valid model',f.evaluate('cards.length')==0)
    f=setup();f.evaluate('''()=>{ffTest.customColumns=[];ffTest.send();}''')
    check('Invalid setup state still commits without a false renderer failure',f.evaluate('observed.map(x=>x[0]).join()')=='start,finish')
    f=setup()
    f.locator('.ff-query').fill('<img src=x onerror=alert(1)>');f.locator('.ff-query').press('Enter')
    check('Markup-looking query is literal text, not an element',f.locator('img[src=x]').count()==0 and f.locator('.ff-query').input_value()=='<img src=x onerror=alert(1)>')
    page.locator('#visualFrame').screenshot(path=str(OUT/'unchanged-compact-bar.png'))
    # Real React diff/update/unmount paths above use the modified vendor runtime.
    browser.close()
OUT.mkdir(parents=True,exist_ok=True)
(OUT/'render-lifecycle-browser.json').write_text(json.dumps({'version':VERSION,'checks':checks,'passed':len(checks),'host':'simulated; actual packaged visual','powerBiExportVerified':False},indent=2)+'\n')
print('COMPLETE '+str(len(checks))+' checks',flush=True)
