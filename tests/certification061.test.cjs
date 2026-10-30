const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {RenderLifecycle}=require('../.core-build/core/renderLifecycle');
const {scan,scanApplication,hardenVendorHtml}=require('../scripts/cert-security.cjs');
function host(){const calls=[];return {calls,renderingStarted:o=>calls.push(['start',o]),renderingFinished:o=>calls.push(['finish',o]),renderingFailed:(o,r)=>calls.push(['fail',o,r])};}
test('Rendering has no finish before the DOM completion callback',()=>{const h=host(),l=new RenderLifecycle(h),c=l.begin({id:1});assert.equal(h.calls.length,1);assert.equal(l.pendingCount,1);c.finish();assert.deepEqual(h.calls.map(c=>c[0]),['start','finish']);assert.equal(l.pendingCount,0);});
test('A thrown renderer completes as failed exactly once, no retry',()=>{const h=host(),l=new RenderLifecycle(h),c=l.begin(1);c.fail();c.fail();c.finish();assert.equal(c.settled,true);assert.deepEqual(h.calls.map(c=>c[0]),['start','fail']);});
test('Delayed finish cannot overwrite failure',()=>{const h=host(),l=new RenderLifecycle(h),c=l.begin(1);const cb=c.finish;c.fail();cb();assert.equal(h.calls.filter(x=>x[0]==='finish').length,0);});
test('Successful callback cannot later turn into a failed frame',()=>{const h=host(),l=new RenderLifecycle(h),c=l.begin(1);c.finish();c.fail();assert.deepEqual(h.calls.map(c=>c[0]),['start','finish']);});
test('Concurrent frames preserve their own options',()=>{const h=host(),l=new RenderLifecycle(h),a=l.begin('a'),b=l.begin('b');b.finish();a.fail();assert.deepEqual(h.calls.map(c=>c.slice(0,2)),[['start','a'],['start','b'],['finish','b'],['fail','a']]);});
test('Destroy completes every pending frame and ignores late callbacks',()=>{const h=host(),l=new RenderLifecycle(h),a=l.begin(1),b=l.begin(2);l.destroy();a.finish();b.fail();assert.equal(l.pendingCount,0);assert.deepEqual(h.calls.map(c=>c[0]),['start','start','fail','fail']);});
test('Throwing host finish callback is not delivered twice',()=>{const h=host();let n=0;h.renderingFinished=()=>{n++;throw Error('host')};const l=new RenderLifecycle(h),c=l.begin(1);assert.doesNotThrow(()=>c.finish());c.fail();assert.equal(n,1);assert.equal(l.pendingCount,0);});
test('Throwing host failure callback is contained',()=>{const h=host();h.renderingFailed=()=>{throw Error('host')};const c=new RenderLifecycle(h).begin(1);assert.doesNotThrow(()=>c.fail());assert.equal(c.settled,true);});
test('All active application modules pass the additional security guard',()=>assert.deepEqual(scanApplication(path.resolve(__dirname,'..')),[]));
for (const code of ['a.innerHTML=b','a["outerHTML"]=b','fetch("anything")','new XMLHttpRequest()','new WebSocket(x)','eval(x)','new Function(x)','setTimeout("something",1)','window.setInterval(`oops${value}`,20)','navigator.sendBeacon(x,y)','document.write(x)']) test('Security guard catches '+code,()=>assert.ok(scan(code).length>0));
test('Static query text and function-valued timers remain permitted',()=>assert.deepEqual(scan('const q="innerHTML and fetch are words"; setTimeout(()=>work(),300); setInterval(callback,100);'),[]));
test('Own raw-HTML JSX is rejected, not silently patched',()=>assert.equal(scan('const a=<div dangerouslySetInnerHTML={{__html:q}}/>','x.tsx',{application:true})[0].rule,'raw-html-jsx'));
for (const property of ['innerHTML','outerHTML']) test('Vendor raw '+property+' cannot execute after transform',()=>{const r=hardenVendorHtml(`function raw(target,value){return target.${property}=value}`);assert.equal(r.edits.length,1);assert.deepEqual(scan(r.code),[]);let writes=0;const target={};Object.defineProperty(target,property,{set:()=>writes++});const context={target};vm.createContext(context);vm.runInContext(r.code,context);assert.throws(()=>context.raw(target,'<img onerror=evil()>'),/does not support raw HTML/);assert.equal(writes,0);});
test('Vendor transform is reproducible and idempotent',()=>{const a='function f(x){x.innerHTML="<svg>";}';const r=hardenVendorHtml(a),r2=hardenVendorHtml(a);assert.equal(r.code,r2.code);assert.equal(hardenVendorHtml(r.code).edits.length,0);});
test('Transform does not hide other forbidden calls',()=>assert.throws(()=>hardenVendorHtml('fetch(x); a.innerHTML=x'),/Forbidden/));
test('Plain DOM and SVG creation remain unchanged',()=>{const x='const p=document.createElementNS("http://www.w3.org/2000/svg","svg");p.textContent="<safe>"';assert.equal(hardenVendorHtml(x).code,x);});
test('Source keeps established design and IDs',()=>{const p=require('../pbiviz.json');assert.equal(p.visual.guid,'fieldFindScope6F2E2BC419F64B839AFD02C06EFD2148');assert.deepEqual(require('../capabilities.json').privileges,[]);assert.equal(typeof require('../config/licensing.json').servicePlanId,'string');});

test('A stalled async render fails on its deadline, not a false successful finish',async()=>{const h=host(),l=new RenderLifecycle(h,5),c=l.begin(1);await new Promise(r=>setTimeout(r,15));c.finish();assert.deepEqual(h.calls.map(c=>c[0]),['start','fail']);assert.equal(l.pendingCount,0);});
