const test=require('node:test'),assert=require('node:assert/strict');
const {validDay,hostDay,parseTypedDay,normaliseDateFilter,dateMatches,availableDates,displayDay,suggestedDays,shiftDay}=require('../.core-build/core/dates.js');
const {search}=require('../.core-build/core/matcher.js');
const {normaliseQuery,sameQuery}=require('../.core-build/core/query.js');
const {makeKeyFilter}=require('../.core-build/core/filter.js');
const {readSnapshot}=require('../.core-build/powerbi/dataReader.js');
const {HostFilterTracker,filterSignature}=require('../.core-build/core/filterState.js');
const {readOwnedFilter}=require('../.core-build/powerbi/filterObservation.js');
const field=(name)=>({table:'Articles',column:name,id:JSON.stringify(['Articles',name]),displayName:name});
const fields=[field('Name'),field('Supplier')],df=field('Delivery'),key={table:'Articles',column:'ID'};
const S={complete:true,fields,dateFields:[df],keyTarget:key,rows:[{key:1,values:['STRÅLA lamp','Nordic'],dates:['2026-10-08']},{key:2,values:['BILLY chair','Strala Supply'],dates:['2026-10-08']},{key:3,values:['Billy shelf','Northline'],dates:['2026-10-31']},{key:4,values:['BILLY','Billy'],dates:[null]},{key:5,values:['Cafe','Nordic'],dates:['2026-11-01']}]};
const Q=(over={})=>({text:'',mode:'contains',logic:'any',fieldIds:fields.map(f=>f.id),...over});
const D=(condition='on',over={})=>({fieldId:df.id,condition,from:'2026-10-08',...over});
for(const value of ['2026-10-08','2024-02-29','2000-02-29','0001-01-01','9999-12-31'])test(`Valid calendar day ${value}`,()=>assert.equal(validDay(value),true));
for(const value of ['2026-02-29','1900-02-29','2026-04-31','2026-13-01','0000-01-01','2026-1-8','08/10/2026','2026-10-08T00:00:00Z','',null,17])test(`Reject invalid calendar day ${value}`,()=>assert.equal(validDay(value),false));
for(const [text,day]of [['08/10/2026','2026-10-08'],['8/10/2026','2026-10-08'],['8-10-2026','2026-10-08'],['2026-10-08','2026-10-08'],[' 08.10.2026 ','2026-10-08'],['10/08/2026','2026-08-10']])test(`Explicit day-first/ISO parser ${text}`,()=>assert.equal(parseTypedDay(text),day));
for(const text of ['60637328','1/2/26','31/02/2026','2026-02-30','tomorrow','October 8, 2026'])test(`No implicit guessing for ${text}`,()=>assert.equal(parseTypedDay(text),null));
// 0.5.3: Power BI builds Date cells from wall-clock values in the browser zone, so
// these are constructed the same way (time-zone independent). Zoned strings are
// covered per time zone in host053.test.cjs.
for(const [value,day]of [[new Date(2026,9,8,0,0,0),'2026-10-08'],[new Date(2026,9,8,23,59,59,999),'2026-10-08'],['2026-10-08','2026-10-08'],['2026-10-08T23:59:59','2026-10-08'],[null,null],[undefined,null]])test(`Host date normalization ${value}`,()=>assert.equal(hostDay(value),day));
for(const value of [true,20261008,'08/10/2026','2026-02-30T00:00:00Z',new Date(NaN),'bad'])test(`Invalid host date is not silently cast ${value}`,()=>assert.throws(()=>hostDay(value),{code:'date-value'}));
test('Specific day includes all records with that calendar date',()=>assert.deepEqual(search(S,Q({date:D()})).keys,[1,2]));
test('Text OR across fields AND date matches each row',()=>assert.deepEqual(search(S,Q({text:'strala',date:D()})).keys,[1,2]));
test('Date rejects otherwise matching text on another day',()=>assert.deepEqual(search(S,Q({text:'billy',date:D()})).keys,[2]));
test('Between includes both boundary dates',()=>assert.deepEqual(search(S,Q({date:D('between',{from:'2026-10-08',to:'2026-10-31'})})).keys,[1,2,3]));
test('Equal From/To is a whole single day',()=>assert.deepEqual(search(S,Q({date:D('between',{to:'2026-10-08'})})).keys,[1,2]));
test('On or before is inclusive',()=>assert.deepEqual(search(S,Q({date:D('onOrBefore')})).keys,[1,2]));
test('On or after is inclusive and excludes null',()=>assert.deepEqual(search(S,Q({date:D('onOrAfter',{from:'2026-10-31'})})).keys,[3,5]));
test('Blank date explicitly matches null rather than zero or text',()=>assert.deepEqual(search(S,Q({date:D('blank')})).keys,[4]));
test('All fields means ALL columns, not any words',()=>assert.deepEqual(search(S,Q({text:'billy',logic:'all',date:D('blank')})).keys,[4]));
test('Multiword remains one literal phrase',()=>assert.deepEqual(search(S,Q({text:'lamp Nordic'})).keys,[]));
test('Date-only query emits a real filter, never clears it',()=>assert.deepEqual(makeKeyFilter(key,search(S,Q({date:D()}))).values,[1,2]));
test('No dates in range means a no-results contradiction, not all records',()=>{const f=makeKeyFilter(key,search(S,Q({date:D('between',{from:'2027-01-01',to:'2027-01-31'})})));assert.equal(f.logicalOperator,'And');assert.equal(f.conditions.length,2);});
test('Clearing date retains text predicate',()=>assert.deepEqual(search(S,Q({text:'billy',date:null})).keys,[2,3,4]));
test('Clearing text retains date predicate',()=>assert.deepEqual(search(S,Q({date:D()})).keys,[1,2]));
test('Clearing both produces null owned filter',()=>assert.equal(makeKeyFilter(key,search(S,Q())),null));
test('Date-only model does not need dummy text field',()=>{const snapshot={...S,fields:[],rows:S.rows.map(r=>({...r,values:[]}))};assert.deepEqual(search(snapshot,Q({fieldIds:[],date:D()})).keys,[1,2]);});
test('Cannot text-search zero configured text/number fields',()=>assert.throws(()=>search({...S,fields:[],rows:S.rows.map(r=>({...r,values:[]}))},Q({text:'strala',fieldIds:[]})),{code:'scope'}));
test('Date column must exist in snapshot',()=>assert.throws(()=>search(S,Q({date:{...D(),fieldId:'wrong'}})),{code:'date-field'}));
test('Date filter rejects reversed ranges',()=>assert.throws(()=>normaliseDateFilter(D('between',{from:'2026-11-01',to:'2026-10-01'})),{code:'date-order'}));
test('Date filter rejects missing end',()=>assert.throws(()=>normaliseDateFilter(D('between')),{code:'date-to'}));
test('Date filter ignores irrelevant dates when selecting blank',()=>assert.deepEqual(normaliseDateFilter(D('blank',{from:'bad'})),{fieldId:df.id,condition:'blank'}));
test('Date field/order/condition participates in query equality',()=>{assert.equal(sameQuery(Q({date:D()}),Q({date:D('onOrAfter')})),false);assert.equal(sameQuery(null,Q({date:D()})),false);assert.equal(sameQuery(null,Q()),true);});
test('Cannot evaluate dates using partial data',()=>assert.throws(()=>search({...S,complete:false},Q({date:D()})),{code:'incomplete'}));
test('Available dates are distinct, sorted, complete',()=>assert.deepEqual(availableDates(S)[0],{fieldId:df.id,days:['2026-10-08','2026-10-31','2026-11-01'],blanks:1,complete:true}));
test('Never suggest dates from incomplete snapshot',()=>assert.deepEqual(availableDates({...S,complete:false}),[]));
test('Date dropdown search uses DD/MM/YYYY and ISO',()=>{const days=availableDates(S)[0].days;assert.deepEqual(suggestedDays(days,'08/10'),['2026-10-08']);assert.deepEqual(suggestedDays(days,'2026-11'),['2026-11-01']);assert.deepEqual(suggestedDays(days,'8 Oct'),['2026-10-08']);});
test('Date suggestion limit is display-only, not a filter truncation',()=>assert.equal(suggestedDays(availableDates(S)[0].days,'',1).length,1));
test('Calendar navigation spans leap day and DST without local shifts',()=>{assert.equal(shiftDay('2024-02-28',1),'2024-02-29');assert.equal(shiftDay('2026-10-25',1),'2026-10-26');});
test('Conflicting dates for the same record key are rejected',()=>assert.throws(()=>search({...S,rows:[...S.rows,{...S.rows[0],dates:['2026-11-01']}]},Q({date:D()})),{code:'duplicate-key'}));
test('Ragged date array is rejected rather than treated as blank',()=>assert.throws(()=>search({...S,rows:[{...S.rows[0],dates:[]}]},Q({date:D()})),{code:'row-width'}));
test('Array-valued Power BI filter echo is the submitted filter',()=>{const filter=makeKeyFilter(key,search(S,Q({text:'strala'})));assert.equal(filterSignature([filter]),filterSignature(filter));const tracker=new HostFilterTracker();tracker.expect(filter);assert.equal(tracker.observe([filter]),'unchanged');});
test('Empty metadata filter arrays are normalized to null',()=>{assert.equal(filterSignature([]),null);assert.deepEqual(readOwnedFilter({general:{filter:[]}},undefined,key),{known:true,filter:null});});
test('Array metadata filter is unwrapped before use',()=>{const filter=makeKeyFilter(key,search(S,Q({text:'strala'})));assert.deepEqual(readOwnedFilter({general:{filter:[filter]}},undefined,key),{known:true,filter});});
test('Late acknowledged filter echoes do not replace newest filter',()=>{const a=makeKeyFilter(key,search(S,Q({text:'strala'}))),b=makeKeyFilter(key,search(S,Q({text:'billy'})));const t=new HostFilterTracker();t.expect(a);t.observe(a);t.expect(b);t.observe(b);assert.equal(t.observe([a]),'unchanged');assert.equal(t.staleEcho,true);});
test('Zero-text date request validates dates instead of clearing',()=>assert.throws(()=>normaliseQuery(Q({date:D('on',{from:'bad'})})),{code:'date-from'}));
test('Runtime matching agrees with independent row predicates for 87 cases',()=>{
 const queries=['','strala','BILLY','chair','Nordic','zzzz'];const modes=['contains','startsWith','exact'];const conditions=[null,D(),D('between',{to:'2026-10-31'}),D('blank'),D('onOrAfter',{from:'2026-10-31'})];
 let count=0;
 for(const text of queries)for(const mode of modes)for(const date of conditions){if(!text&&!date)continue;const query=Q({text,mode,date});const needle=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const expected=S.rows.filter(row=>{
 const textOk=!text||row.values.some(value=>{const v=(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return mode==='contains'?v.includes(needle):mode==='startsWith'?v.startsWith(needle):v===needle;});
 const day=row.dates[0];const dateOk=!date||(date.condition==='blank'?day===null:day!==null&&(date.condition==='on'?day===date.from:date.condition==='between'?day>=date.from&&day<=date.to:day>=date.from));return textOk&&dateOk;
 }).map(r=>r.key);assert.deepEqual(search(S,query).keys,expected);count++;}
 assert.ok(count>=80);
});
