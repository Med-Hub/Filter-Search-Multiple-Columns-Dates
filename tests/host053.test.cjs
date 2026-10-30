// 0.5.3 regressions for host contracts the 0.5.2 simulator did not model:
// Power BI's own-filter echo, wall-clock Date cells, long date catalogues and
// API 5.4 host capability/dialog details.
const test=require('node:test'),assert=require('node:assert/strict');
const {hostDay,localDay,availableDates,daySuggestions,suggestedDays,dateMatches}=require('../.core-build/core/dates.js');
const {readOwnedFilter}=require('../.core-build/powerbi/filterObservation.js');
const {HostFilterTracker,filterSignature}=require('../.core-build/core/filterState.js');
const {SearchController}=require('../.core-build/core/controller.js');
const {readSnapshot}=require('../.core-build/powerbi/dataReader.js');
const {search}=require('../.core-build/core/matcher.js');
const {settingsResult}=require('../.core-build/core/compactOptions.js');
const {interactionsAllowedBy,textOnAccent}=require('../.core-build/core/hostPolicy.js');

const key={table:'Articles',column:'Article No'};
const col=(name,roles,type)=>({displayName:name,queryName:'Articles.'+name,expr:{source:{entity:'Articles'},ref:name},roles,type});
// What Power BI's API types general.filter as: an opaque SemanticFilter, not JSON.
const semantic=()=>({whereItems:[{condition:{_kind:16,left:{},right:{}}}]});

// ---------- A. Own-filter echo ----------
test('Opaque SemanticFilter in general.filter is ignored; the JSON echo in jsonFilters is used',()=>{
 const json={$schema:'https://powerbi.com/product/schema#basic',filterType:1,target:key,operator:'In',values:[1,2]};
 assert.deepEqual(readOwnedFilter({general:{filter:semantic()}},[json],key),{known:true,filter:json});
});
test('Opaque general.filter without jsonFilters is unknown, never a replacement',()=>{
 assert.deepEqual(readOwnedFilter({general:{filter:semantic()}},undefined,key),{known:false});
 assert.equal(filterSignature(semantic()),'unsupported'); // why 0.5.2 saw every echo as "replaced"
});
test('Own search echo keeps the controller searchable and dates available (Power BI shape)',()=>{
 const tracker=new HostFilterTracker();let sent;
 const c=new SearchController({apply:f=>{tracker.expect(f);sent=f;}});
 const snap={complete:true,keyTarget:key,fields:[{table:'Articles',column:'Name',id:'n',displayName:'Name'}],dateFields:[{table:'Articles',column:'Next Delivery',id:'d',displayName:'Next Delivery'}],
  rows:[{key:1,values:['STRÅLA'],dates:['2026-10-08']},{key:2,values:['BILLY'],dates:['2026-10-12']}]};
 c.ingest(snap,true);c.submit({text:'strala',fieldIds:['n'],mode:'contains',logic:'any'});
 // Host update after applyJsonFilter: SemanticFilter in objects, JSON in jsonFilters.
 const owned=readOwnedFilter({general:{filter:semantic()}},[structuredClone(sent)],key);
 assert.equal(owned.known,true);assert.equal(tracker.observe(owned.filter),'unchanged');
 c.ingest(snap,true);
 assert.equal(c.canSearch,true);assert.equal(c.needsRefresh,false);
 assert.deepEqual(availableDates(c.currentSnapshot)[0].days,['2026-10-08','2026-10-12']);
});
test('Own clear echo (empty jsonFilters, no general.filter) is the expected clear',()=>{
 const tracker=new HostFilterTracker();tracker.expect(null);
 const owned=readOwnedFilter({},[],key);assert.deepEqual(owned,{known:true,filter:null});assert.equal(tracker.observe(owned.filter),'unchanged');
});
test('A bookmark restoring a different key list is still detected as replaced',()=>{
 const tracker=new HostFilterTracker();tracker.expect({target:key,operator:'In',values:[1]});tracker.observe({target:key,operator:'In',values:[1]});
 const owned=readOwnedFilter({general:{filter:semantic()}},[{target:key,operator:'In',values:[7,8]}],key);
 assert.equal(tracker.observe(owned.filter),'replaced');
});

// ---------- B. Wall-clock dates in several time zones ----------
const zones=['UTC','Europe/Amsterdam','America/New_York','Asia/Tokyo','Pacific/Kiritimati','Pacific/Pago_Pago','Australia/Lord_Howe'];
for(const zone of zones){
 test(`Power BI wall-clock Date cells keep their displayed day in ${zone}`,()=>{
  const before=process.env.TZ;process.env.TZ=zone;
  try{
   for(const [y,m,d] of [[2026,10,8],[2026,3,29],[2026,10,25],[2024,2,29],[2026,12,31],[2027,1,1]]){
    const day=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    assert.equal(hostDay(new Date(y,m-1,d,0,0,0)),day,'midnight '+day);
    assert.equal(hostDay(new Date(y,m-1,d,23,59,59,999)),day,'late '+day);
    assert.equal(hostDay(new Date(y,m-1,d,12,0,0).toISOString()),day,'serialised instant '+day); // JSON form of the same cell
    assert.equal(hostDay(`${day}T23:59:59`),day,'zone-less string '+day);
   }
  }finally{if(before===undefined)delete process.env.TZ;else process.env.TZ=before;}
 });
}
test('0.5.2 UTC reading shifted midnight one day early in the Netherlands (documented regression)',()=>{
 const before=process.env.TZ;process.env.TZ='Europe/Amsterdam';
 try{
  const cell=new Date(2026,9,8);
  assert.equal(cell.toISOString().slice(0,10),'2026-10-07'); // what 0.5.2 used
  assert.equal(hostDay(cell),'2026-10-08');assert.equal(localDay(cell),'2026-10-08');
 }finally{if(before===undefined)delete process.env.TZ;else process.env.TZ=before;}
});
test('Netherlands report: specific date and range match the days shown in Power BI',()=>{
 const before=process.env.TZ;process.env.TZ='Europe/Amsterdam';
 try{
  const columns=[col('Article No',{recordKey:true},{numeric:true}),col('Article Name',{fields:true},{text:true}),col('Next Delivery',{dates:true},{dateTime:true})];
  const rows=[[1,'STRÅLA lamp',new Date(2026,9,8,0,0,0)],[2,'BILLY',new Date(2026,9,8,23,59,59)],[3,'Chair',new Date(2026,9,12,12,0,0)],[4,'Table',new Date(2026,9,31,0,0,0)],[5,'Cafe',new Date(2026,10,1,0,0,0)],[6,'Shelf',new Date(2026,8,30,23,59,59)]];
  const snap=readSnapshot({columns,rows},false),days=availableDates(snap)[0].days,fieldId=snap.dateFields[0].id;
  assert.deepEqual(days,['2026-09-30','2026-10-08','2026-10-12','2026-10-31','2026-11-01']);
  const q=date=>search(snap,{text:'',fieldIds:snap.fields.map(f=>f.id),mode:'contains',logic:'any',date}).keys;
  assert.deepEqual(q({fieldId,condition:'on',from:'2026-10-08'}),[1,2]);
  assert.deepEqual(q({fieldId,condition:'between',from:'2026-10-01',to:'2026-10-31'}),[1,2,3,4]);
  assert.equal(dateMatches('2026-10-31',{fieldId,condition:'onOrBefore',from:'2026-10-31'}),true);
 }finally{if(before===undefined)delete process.env.TZ;else process.env.TZ=before;}
});

// ---------- C. Long date catalogues ----------
const many=Array.from({length:400},(_,i)=>{const d=new Date(Date.UTC(2025,0,1)+i*86400000);return d.toISOString().slice(0,10);});
test('Untyped list opens around the anchor day instead of the oldest 80 dates',()=>{
 const anchor=many[300],r=daySuggestions(many,'',80,anchor);
 assert.equal(r.days.length,80);assert.equal(r.more,true);assert.ok(r.days.includes(anchor));assert.ok(r.days.indexOf(anchor)>=10&&r.days.indexOf(anchor)<=30);
});
test('Anchor after the last available day shows the latest dates',()=>{const r=daySuggestions(many,'',80,'2099-01-01');assert.deepEqual(r.days,many.slice(-80));});
test('Anchor before the first available day shows the earliest dates',()=>{const r=daySuggestions(many,'',80,'2000-01-01');assert.deepEqual(r.days,many.slice(0,80));});
test('Typed text still narrows from the full catalogue',()=>{const r=daySuggestions(many,'2026-02',80,many[0]);assert.ok(r.days.length>0&&r.days.every(d=>d.startsWith('2026-02')));assert.equal(r.more,false);});
test('Short catalogues are shown complete and never report more',()=>{const r=daySuggestions(many.slice(0,12),'',80,many[5]);assert.equal(r.days.length,12);assert.equal(r.more,false);});
test('suggestedDays without an anchor keeps the previous oldest-first contract',()=>assert.deepEqual(suggestedDays(many,''),many.slice(0,80)));

// ---------- D. Host policy helpers ----------
test('Interaction policy is read from hostCapabilities (API 5.x)',()=>{
 assert.equal(interactionsAllowedBy({hostCapabilities:{allowInteractions:false}}),false);
 assert.equal(interactionsAllowedBy({hostCapabilities:{allowInteractions:true}}),true);
 assert.equal(interactionsAllowedBy({hostCapabilities:{}}),true);
 assert.equal(interactionsAllowedBy({allowInteractions:false}),false); // legacy hosts
 assert.equal(interactionsAllowedBy(undefined),true);
});
const lum=hex=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4);return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];};
const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
for(const accent of ['#166B54','#0058A3','#FFDB00','#FFFFFF','#000000','#E00751','#A4F0C8','#777777'])test(`Apply text picks the more readable colour on ${accent}`,()=>{
 const text=textOnAccent(accent),other=text==='#FFFFFF'?'#1B1B1B':'#FFFFFF';
 assert.ok(contrast(text,accent)>=contrast(other,accent));
});
test('High contrast: Apply text uses the theme background, never white on a light foreground',()=>{assert.equal(textOnAccent('#FFFF00','#000000'),'#000000');assert.equal(textOnAccent('#FFFFFF','#000000'),'#000000');});
test('IKEA-style yellow accent gets dark Apply text',()=>assert.equal(textOnAccent('#FFDB00'),'#1B1B1B'));

// ---------- E. Official SDK schema ----------
test('capabilities.json validates against the pinned API capabilities schema',(t)=>{
 let Ajv,schema;
 try{Ajv=require('ajv');schema=require('powerbi-visuals-api/schema.capabilities.json');}catch{t.skip('SDK dependencies not installed (npm install)');return;}
 const fs=require('node:fs'),path=require('node:path');
 const caps=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../capabilities.json'),'utf8'));
 const ajv=new (Ajv.default||Ajv)({allErrors:true,strict:false});
 const ok=ajv.validate(schema,caps);
 assert.equal(ok,true,JSON.stringify(ajv.errors?.slice(0,5)));
});

// ---------- F. Chip text as in the approved mock ----------
const {compactDateLabel,dateLabel}=require('../.core-build/core/dates.js');
const between=(from,to)=>({fieldId:'d',condition:'between',from,to});
for(const [filter,today,label] of [
 [between('2026-10-01','2026-10-31'),'2026-10-09','1–31 Oct'],
 [between('2026-09-28','2026-10-04'),'2026-10-09','28 Sep – 4 Oct'],
 [between('2025-10-01','2025-10-31'),'2026-10-09','1–31 Oct 2025'],
 [between('2026-12-15','2027-01-15'),'2026-10-09','15 Dec 2026 – 15 Jan 2027'],
 [between('2026-10-08','2026-10-08'),'2026-10-09','8 Oct'],
 [{fieldId:'d',condition:'on',from:'2026-10-08'},'2026-10-09','8 Oct 2026'],
 [{fieldId:'d',condition:'blank'},'2026-10-09','No date'],
])test(`Chip label ${label}`,()=>assert.equal(compactDateLabel(filter,today),label));
test('Tooltips and screen readers keep the full range label',()=>assert.equal(dateLabel(between('2026-10-01','2026-10-31')),'1 Oct 2026 – 31 Oct 2026'));
