"""Development simulator: exact packaged code in opaque sandbox iframes.
Native Power BI services are simulated; no parent DOM escape is available to
application code. A second iframe exercises createModalDialog/resultState.

0.5.3: the simulated host now follows the real Power BI shapes the 0.5.2
simulator did not: Date cells are Date objects built from wall-clock values
in the browser's time zone (T.dateMode='local'; 'utc' = old simulator), and
dataView.metadata.objects.general.filter holds an opaque SemanticFilter while
the JSON echo arrives in options.jsonFilters (T.generalFilter='semantic';
'json' = old simulator). Interaction policy lives in hostCapabilities.

Usage: python scripts/make-search-date-harness.py [package.pbiviz] [output.html]
"""
from pathlib import Path
import zipfile,json,base64,sys,os
root=Path(__file__).resolve().parent.parent
project_version=json.loads((root/'package.json').read_text())['version']
def default_package():
 dist=root/'dist';found=sorted(dist.glob(f'*{project_version}*.pbiviz')) if dist.exists() else []
 if not found:sys.exit(f'No dist/*{project_version}*.pbiviz found; run npm run package first or pass a package path.')
 return found[-1]
pkg=Path(sys.argv[1]) if len(sys.argv)>1 else default_package()
with zipfile.ZipFile(pkg) as z:
 o=json.loads(z.read('package.json'));r=json.loads(z.read(o['resources'][0]['file']))
css=r['content']['css'];js=r['content']['js'].replace('</script',r'<\/script');guid=r['visual']['guid']
version='.'.join(str(r['visual']['version']).split('.')[:3])
# Unit/integration fixture ONLY. This changes an in-memory JS string, not a .pbiviz.
# Never use this HTML simulator or its mocked licences as a customer package.
fixture_plan=os.environ.get('FF_LICENSE_TEST_PLAN_ID', '')
host_plan=os.environ.get('FF_LICENSE_HOST_PLAN_ID', '')
if fixture_plan and host_plan:
 raise ValueError('Choose source-fixture OR host-only licensing, never both.')
if fixture_plan:
 needle='exports.DATE_PRO_SERVICE_ID = "";'
 if js.count(needle) != 1: raise ValueError('The licensing fixture expected one empty Service ID; the package is not changed.')
 js=js.replace(needle, 'exports.DATE_PRO_SERVICE_ID = '+json.dumps(fixture_plan)+';')
licence_boot=os.environ.get('FF_LICENSE_BOOT', '')

boot=r'''
const GUID=__GUID__;
const T=window.ffTest={dateMode:'local',generalFilter:'semantic',isInFocus:false,focusCalls:[],rejectDialog:false,calls:[],filter:null,metadata:{},modalCalls:0,persistCalls:0,failApply:false,failClear:false,fetchCalls:0,customColumns:null,rawRows:null,selfFilter:false,delay:0,segments:0,initialCount:3,rowsPerFetch:3,echoShape:'array',queuedEchoes:[],manualEcho:false,externalFilters:[],
rows:[
 [60637328,'STRÅLA pendant lamp','Nordic','M16D07',12.5,'2026-10-08T00:00:00Z'],
 [60637329,'BILLY bookcase','STRÅLA Supply','M16D08',0,'2026-10-08T23:59:59Z'],
 [60637330,'Plain chair','Billy Supply','M16D09',-2.5,'2026-10-12T12:00:00Z'],
 [60637331,'BILLY shelf','Northline',null,null,null],
 [60637332,'MÖRBYLÅNGA table','Northline','M16D10',1e-7,'2026-10-31T23:59:59Z'],
 [60637333,'Café table','Acme','M16D11',42,'2026-11-01T00:00:00Z'],
 [60637334,'BILLY','Billy','M16D12',99,'2026-09-30T23:59:59Z']
],types:{'Article No':{numeric:true},Price:{numeric:true},'Delivery Date':{dateTime:true}},search:['Article Name','Supplier'],dateFields:['Delivery Date'],key:'Article No',width:600,height:76};
const rawNames=['Article No','Article Name','Supplier','SLID_H','Price','Delivery Date'];
// 0.5.4: the report theme as Power BI exposes it (structural colours + data colours via getColor).
T.themes={
 default:{foreground:'#252423',background:'#FFFFFF',foregroundNeutralSecondary:'#605E5C',foregroundNeutralTertiary:'#B3B0AD',backgroundLight:'#F3F2F1',backgroundNeutral:'#C8C6C4',negative:'#D64554',dataColors:['#118DFF','#12239E','#E66C37']},
 green:{foreground:'#1B2A24',background:'#FFFFFF',foregroundNeutralSecondary:'#5D6B66',foregroundNeutralTertiary:'#A8B3AE',backgroundLight:'#EEF2F0',backgroundNeutral:'#C9D1CD',negative:'#C4314B',dataColors:['#1E5A44','#E8A33D','#3A7CA5']},
 dark:{foreground:'#F3F2F1',background:'#1F1F1F',foregroundNeutralSecondary:'#C8C6C4',foregroundNeutralTertiary:'#6E6C6A',backgroundLight:'#2B2B2B',backgroundNeutral:'#484644',negative:'#E3626F',dataColors:['#4CC2A0','#F2C811','#A0D1FF']},
 yellow:{foreground:'#252423',background:'#FFFFFF',foregroundNeutralSecondary:'#605E5C',foregroundNeutralTertiary:'#B3B0AD',backgroundLight:'#F3F2F1',backgroundNeutral:'#C8C6C4',negative:'#D64554',dataColors:['#F2C811','#0058A3']},
};
T.theme='default';T.highContrast=null;T.colourKeys={};
T.palette=()=>{const t=T.themes[T.theme],hc=T.highContrast;const c=v=>({value:v});const keys=T.colourKeys[T.theme]=T.colourKeys[T.theme]||{};
 return {isHighContrast:!!hc,foreground:c(hc?hc.foreground:t.foreground),background:c(hc?hc.background:t.background),foregroundSelected:c(hc?hc.selected:t.foreground),
  foregroundNeutralSecondary:c(hc?hc.foreground:t.foregroundNeutralSecondary),foregroundNeutralTertiary:c(hc?hc.foreground:t.foregroundNeutralTertiary),backgroundLight:c(hc?hc.background:t.backgroundLight),backgroundNeutral:c(t.backgroundNeutral),negative:c(t.negative),hyperlink:c('#0078D4'),
  getColor(key){if(!(key in keys))keys[key]=t.dataColors[Object.keys(keys).length%t.dataColors.length];return c(keys[key]);},reset(){return this;}};};
T.hit=(row,filter)=>filter===null?true:filter.operator==='In'?filter.values.includes(row[0]):false;
// Power BI builds Date cells from the model's wall-clock value in the browser zone.
T.hostDate=value=>{if(T.dateMode==='utc')return new Date(value);const m=/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(value);return new Date(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0),+(m[6]||0));};
// What Power BI's API types general.filter as: an opaque SemanticFilter.
T.semantic=filter=>filter?{whereItems:[{condition:{_kind:'opaque-semantic-filter'}}]}:undefined;
function columns(){const all=[T.key,...T.search.filter(n=>n!==T.key),...T.dateFields];return all.map(name=>({displayName:name,queryName:'Articles.'+name,expr:{source:{entity:'Articles'},ref:name},type:T.types[name]||{text:true},roles:{...(name===T.key?{recordKey:true}:{}),...(T.search.includes(name)?{fields:true}:{}),...(T.dateFields.includes(name)?{dates:true}:{})}}));}
T.send=(opts={})=>{
 const c=T.customColumns||columns(),filter=Object.prototype.hasOwnProperty.call(opts,'echoFilter')?opts.echoFilter:T.filter;
 let rows=T.rawRows||T.rows.filter(r=>!T.selfFilter||T.hit(r,filter)).map(row=>c.map(col=>{const value=row[rawNames.indexOf(col.displayName)];return col.type?.dateTime&&typeof value==='string'?T.hostDate(value):value;}));
 const segmented=opts.segment??(T.segments>0);
 if(segmented)rows=rows.slice(0,T.loadedCount||T.initialCount);
 const representation=T.echoShape==='array'?(filter?[filter]:[]):filter;
 const general=T.generalFilter==='json'?{general:{filter:representation}}:(filter?{general:{filter:T.semantic(filter)}}:{});
 const dv={metadata:{columns:c,objects:{...T.metadata,...general},...(segmented?{segment:{}}:{})},table:{columns:c,rows}};
 T.visual.update({isInFocus:T.isInFocus,type:opts.type??2,viewport:{width:T.width,height:T.height},operationKind:opts.operationKind??0,...(opts.omitViews?{}:{dataViews:[dv]}),jsonFilters:[...(filter?[filter]:[]),...T.externalFilters]});
};
T.updateParent=()=>parent.postMessage({ffbridge:'results',keys:T.rows.filter(row=>T.hit(row,T.filter)).map(r=>r[0]),calls:T.calls.length},'*');
const host={eventService:{renderingStarted(){},renderingFinished(){},renderingFailed(){}},createSelectionManager:()=>({showContextMenu(){}}),colorPalette:T.palette(),hostCapabilities:{allowModalDialog:true,allowInteractions:true},
 fetchMoreData(){T.fetchCalls++;if(T.segments<=0)return false;setTimeout(()=>{T.loadedCount=(T.loadedCount||T.initialCount)+T.rowsPerFetch;T.segments--;T.send();},10);return true;},
 applyJsonFilter(filter,objectName,propertyName,action){if(filter===null&&T.failClear||filter!==null&&T.failApply)throw Error('Test host rejected filter');T.calls.push({filter:structuredClone(filter),objectName,propertyName,action});T.filter=filter;T.updateParent();const echo=structuredClone(filter);if(T.manualEcho)T.queuedEchoes.push(echo);else if(T.delay>0)setTimeout(()=>T.send({echoFilter:echo}),T.delay);else T.send();},
 persistProperties(){T.persistCalls++;throw Error('Reader menu must not persist shared appearance');},
 switchFocusModeState(focused){T.focusCalls.push(focused);if(focused){T.savedSize=[T.width,T.height];T.width=720;T.height=640;}else{[T.width,T.height]=T.savedSize||[600,40];}T.isInFocus=focused;parent.postMessage({ffbridge:'resizeVisual',width:T.width,height:T.height},'*');T.send({type:4,omitViews:true});},
 openModalDialog(name,options,request){T.modalCalls++;T.lastDialogOptions=options;if(T.rejectDialog||!host.hostCapabilities.allowModalDialog)return Promise.reject(Error('Dialog blocked by host'));return new Promise((resolve,reject)=>{const id='dialog'+T.modalCalls;const listener=e=>{if(e.data?.ffbridge==='reply'&&e.data.id===id){removeEventListener('message',listener);e.data.error?reject(Error(e.data.error)):resolve({actionId:e.data.actionId,resultState:e.data.resultState});}};addEventListener('message',listener);parent.postMessage({ffbridge:'open',id,name,options,request},'*');});}
};
// Host-only licence test double. Not included in packaged application code.
T.licenceCalls=0;T.licenceNotifications=[];T.licenceClears=0;T.licenceState={plans:__PLANS__,isLicenseUnsupportedEnv:false,isLicenseInfoAvailable:true};
T.licenceDelay=0;T.licenceFailure=false;T.licenceHangs=false;T.locale='en-US';
__LICENCE_BOOT__
if(T.licenceManagerMissing!==true)host.licenseManager={
 getAvailableServicePlans(){T.licenceCalls++;const state=structuredClone(T.licenceState);return new Promise((resolve,reject)=>{if(T.licenceHangs)return;setTimeout(()=>T.licenceFailure?reject(Error('simulated licence lookup failure')):resolve(state),T.licenceDelay);});},
 notifyFeatureBlocked(tooltip){T.licenceNotifications.push(tooltip);return T.licenceNotificationFails?Promise.reject(Error('native banner unavailable')):Promise.resolve(T.licenceNotificationResult!==false);},
 clearLicenseNotification(){T.licenceClears++;return Promise.resolve(true);},
 notifyLicenseRequired(){throw Error('Must never block the whole free visual.');}
};
host.locale=T.locale;
Object.defineProperty(host,'colorPalette',{get:()=>T.palette()});T.host=host;T.plugin=window.powerbi.visuals.plugins[GUID];T.visual=T.plugin.create({host,element:document.getElementById('app')});
T.resize=(w,h)=>{T.width=w;T.height=h;T.send({type:4,omitViews:true});};T.send();T.updateParent();
'''.replace('__GUID__',json.dumps(guid)).replace('__PLANS__',json.dumps([{'spIdentifier':fixture_plan or host_plan,'state':1}] if (fixture_plan or host_plan) else [])).replace('__LICENCE_BOOT__',licence_boot)
baseHead='<!doctype html><html><head><meta charset="utf-8"><style>html,body,#app{margin:0;width:100%;height:100%;overflow:hidden}'+css+'</style></head><body><div id="app"></div><script>window.powerbi={};</script><script>'+js+'</script>'
frame=baseHead+'<script>'+boot+'</script></body></html>'
parentJS=r'''
const encode=s=>btoa(unescape(encodeURIComponent(s)));
const base=__BASE__;
const visual=document.getElementById('visualFrame');visual.srcdoc=__FRAME__;
let active=null,result=null,dialog=null;
window.addEventListener('message',e=>{
 if(e.source===visual.contentWindow&&e.data?.ffbridge==='open'){
  active=e.data;result=null;document.getElementById('backdrop').hidden=false;
  dialog=document.createElement('iframe');dialog.name='dialogFrame';dialog.id='dialogFrame';dialog.setAttribute('sandbox','allow-scripts');
  const script=`const req=${JSON.stringify(e.data.request)};const plugin=window.powerbi.visuals.plugins[${JSON.stringify(__GUID__)}];window.dialogTest={result:null};window.dialogTest.instance=plugin.createModalDialog(${JSON.stringify(e.data.name)},{element:document.getElementById('app'),host:{setResult(value){dialogTest.result=value;parent.postMessage({ffbridge:'dialogResult',value},'*');},close(actionId,value){parent.postMessage({ffbridge:'close',actionId,value},'*');}}},req);`;
  dialog.srcdoc=base+'<script>'+script.replaceAll('</script','<\\/script')+'<\/script></body></html>';
  document.getElementById('dialogMount').replaceChildren(dialog);
 } else if(dialog&&e.source===dialog.contentWindow&&e.data?.ffbridge==='dialogResult'){result=e.data.value;window.latestDialogResult=result;}
 else if(dialog&&e.source===dialog.contentWindow&&e.data?.ffbridge==='close'){if(e.data.value)result=e.data.value;window.closeHostDialog(e.data.actionId);}
 else if(e.source===visual.contentWindow&&e.data?.ffbridge==='resizeVisual'){visual.style.width=e.data.width+'px';visual.style.height=e.data.height+'px';}
 else if(e.source===visual.contentWindow&&e.data?.ffbridge==='results'){document.getElementById('resultCount').textContent=e.data.keys.length+' synthetic records visible';window.lastResults=e.data;}
});
window.closeHostDialog=actionId=>{if(!active)return;visual.contentWindow.postMessage({ffbridge:'reply',id:active.id,actionId,resultState:result},'*');document.getElementById('backdrop').hidden=true;document.getElementById('dialogMount').replaceChildren();dialog=null;active=null;};
document.getElementById('hostOK').onclick=()=>closeHostDialog(1);document.getElementById('hostCancel').onclick=()=>closeHostDialog(2);document.getElementById('hostClose').onclick=()=>closeHostDialog(2);
'''.replace('__FRAME__',json.dumps(frame)).replace('__BASE__',json.dumps(baseHead)).replace('__GUID__',json.dumps(guid))
# Script safely separated; generated strings may contain </script sequences.
parentJS=parentJS.replace('</script',r'<\/script')
html='''<!doctype html><html><head><meta charset="utf-8"><title>FieldFind Search / Date '''+version+''' — browser simulator</title><style>
body{margin:0;font:13px 'Segoe UI',Arial,sans-serif;background:#f4f7f5;color:#213b32}main{max-width:860px;margin:54px auto;padding:0 24px}.eyebrow{font-size:11px;letter-spacing:.13em;color:#637a70}h1{font-size:23px;margin:8px 0 18px}p{font-size:12px;line-height:1.6;color:#637a70}.visualstage{background:white;border:1px solid #dce6e0;padding:16px;border-radius:10px;width:max-content;margin:26px 0}#visualFrame{display:block;border:0;width:600px;height:76px}#backdrop{position:fixed;inset:0;background:#213b3244;display:flex;align-items:center;justify-content:center}#backdrop[hidden]{display:none}.hostwindow{border:1px solid #dce5e0;border-radius:10px;box-shadow:0 14px 60px #17382a2b;overflow:hidden;background:white;width:392px;max-width:90vw}.hostheader{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #e2e9e5;font-weight:600}.hostheader button{border:0;background:none;color:#64786e;cursor:pointer}#dialogFrame{display:block;border:0;width:392px;height:470px;max-width:90vw;max-height:70vh}.hostfooter{display:none!important;padding:10px 16px;display:flex;justify-content:flex-end;gap:8px;border-top:1px solid #e0e8e3}.hostfooter button{font:12px 'Segoe UI',Arial;padding:7px 17px;border:1px solid #d5e1da;border-radius:5px;cursor:pointer;background:white;color:#36574a}.hostfooter #hostOK{background:#166B54;border-color:#166B54;color:white}.footnote{max-width:640px;font-size:11px;color:#64776e}
</style></head><body><main><div class="eyebrow">FIELDFIND · '''+version+''' · PACKAGED APPLICATION</div><h1>Search and dates, in one compact bar.</h1><p>Try STRALA or BILLY. Reader options sit in the second row; make the frame shorter than 70 px to get the one-row layout. Dates with rows include 08/10/2026 and 31/10/2026.</p><div class="visualstage"><iframe id="visualFrame" name="visualFrame" sandbox="allow-scripts"></iframe></div><p id="resultCount"></p><p class="footnote">Browser simulator with synthetic data. The actual .pbiviz code runs in sandboxed frames. Power BI data, filters and the outer dialog window are simulated; this is not a Power BI Desktop test.</p></main><div id="backdrop" hidden><div class="hostwindow"><div class="hostheader"><span>FieldFind Search / Date — simulated host frame</span><button id="hostClose" aria-label="Close host dialog">×</button></div><div id="dialogMount"></div><div class="hostfooter"><button id="hostCancel">Cancel</button><button id="hostOK">OK</button></div></div></div><script>'''+parentJS+'''</script></body></html>'''
out=Path(sys.argv[2]) if len(sys.argv)>2 else root/f'preview/FieldFind_Search_Date_{version}.html';out.write_text(html);print(out)
