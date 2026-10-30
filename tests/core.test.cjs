const { test } = require('node:test');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const { search, validateSnapshot } = require('../.core-build/core/matcher.js');
const { makeKeyFilter } = require('../.core-build/core/filter.js');
const { normaliseQuery, sameQuery } = require('../.core-build/core/query.js');
const { SearchController } = require('../.core-build/core/controller.js');
const { resolveTarget, fieldId } = require('../.core-build/powerbi/fieldResolver.js');
const { readSnapshot } = require('../.core-build/powerbi/dataReader.js');
const { LIMITS } = require('../.core-build/core/types.js');
const fields = ['Article number', 'Article name', 'Supplier', 'HFB'].map(column => ({ table:'Articles', column, displayName:column, id:fieldId({table:'Articles',column}) }));
const keyTarget = {table:'Articles',column:'Record ID'};
function fixture() { return {fields,keyTarget,complete:true,rows:[
 {key:1,values:['10412345','BILLY bookcase white','Northline','HFB2']},
 {key:2,values:['10412346','BILLY bookcase oak','Northline','HFB2']},
 {key:3,values:['70456780','ARC desk natural','Billy Supply','HFB3']},
 {key:4,values:['20423456','BILLY wall shelf','Studio Wood','HFB1']},
 {key:5,values:['00123456','Plain chair',null,'HFB4']},
 {key:6,values:['00990011','Literal * ? ~ [A]','Café','HFB4']},
 {key:7,values:['00770022','BILLY','Billy','billy']},
 ]}; }
function q(text='billy', opts={}) {return {text, fieldIds:fields.slice(1,3).map(f=>f.id), mode:'contains',logic:'any',...opts};}
function errorCode(fn,code) { assert.throws(fn,e=>e.code===code); }
test('ANY includes a supplier-only match as well as article-name matches',()=>assert.deepEqual(search(fixture(),q()).keys,[1,2,3,4,7]));
test('ALL requires every enabled field on the same record',()=>assert.deepEqual(search(fixture(),q('billy',{logic:'all'})).keys,[7]));
test('Disabled fields do not contribute matches',()=>assert.deepEqual(search(fixture(),q('billy',{fieldIds:[fields[1].id]})).keys,[1,2,4,7]));
test('Contains is case insensitive',()=>assert.deepEqual(search(fixture(),q('BiLlY')).keys,[1,2,3,4,7]));
test('Outer query spaces are trimmed',()=>assert.equal(search(fixture(),q('   BILLY   ')).keys.length,5));
test('Exact differs from Contains',()=>assert.deepEqual(search(fixture(),q('billy',{mode:'exact'})).keys,[7]));
test('Starts with differs from Contains',()=>assert.deepEqual(search(fixture(),q('bookcase',{mode:'startsWith'})).keys,[]));
test('Starts with matches at the beginning',()=>assert.deepEqual(search(fixture(),q('BILLY book',{mode:'startsWith'})).keys,[1,2]));
test('Blanks are not matches',()=>assert.deepEqual(search(fixture(),q('null',{fieldIds:[fields[2].id]})).keys,[]));
test('A blank excludes a row in ALL mode',()=>assert.deepEqual(search(fixture(),q('plain',{logic:'all'})).keys,[]));
test('Leading zeros survive',()=>assert.deepEqual(search(fixture(),q('0012',{fieldIds:[fields[0].id]})).keys,[5]));
for(const literal of ['*','?','~','[A]']) test(`Character ${literal} is literal, not wildcard or regex`,()=>assert.deepEqual(search(fixture(),q(literal,{fieldIds:[fields[1].id]})).keys,[6]));
test('Accents are ignored by default',()=>assert.deepEqual(search(fixture(),q('cafe')).keys,[6]));
test('Accent-sensitive matching can be selected',()=>assert.deepEqual(search(fixture(),q('cafe',{ignoreAccents:false})).keys,[]));
test('Unicode canonical accents match',()=>assert.deepEqual(search(fixture(),q('Cafe\u0301')).keys,[6]));
test('Multiword text is a single literal phrase',()=>assert.deepEqual(search(fixture(),q('billy oak')).keys,[]));
test('Arabic literals are matched without translation or token splitting',()=>{let f=fixture();f.rows.push({key:8,values:['8','كرسي مريح','مورد','HFB1']});assert.deepEqual(search(f,q('كرسي')).keys,[8]);});
test('Empty query returns a clear intent, even before data is complete',()=>{const s=fixture();s.complete=false;const result=search(s,q('  '));assert.equal(makeKeyFilter(keyTarget,result),null);});
test('A nonempty query cannot search incomplete data',()=>{const s=fixture();s.complete=false;errorCode(()=>search(s,q()),'incomplete');});
test('At least one field must remain enabled',()=>errorCode(()=>search(fixture(),q('billy',{fieldIds:[]})),'scope'));
test('Unknown field IDs are rejected',()=>errorCode(()=>search(fixture(),q('billy',{fieldIds:['missing']})),'scope'));
test('Unknown search mode is rejected',()=>errorCode(()=>normaliseQuery(q('x',{mode:'regex'})),'mode'));
test('Long queries are rejected',()=>errorCode(()=>normaliseQuery(q('x'.repeat(513))),'query-length'));
test('Inconsistent values for the same record key are rejected',()=>{const s=fixture();s.rows.push({key:1,values:['1','Different','Supplier','HFB1']});errorCode(()=>search(s,q()),'duplicate-key');});
test('Identical repeated records yield one result per key',()=>{const s=fixture();s.rows.push(s.rows[0]);assert.equal(search(s,q()).keys.filter(k=>k===1).length,1);});
for(const key of [null,'',NaN,Infinity,{},true]) test(`Invalid key ${String(key)} is rejected`,()=>{const s=fixture();s.rows[0].key=key;errorCode(()=>search(s,q()),'key');});
test('Numeric zero is a valid key',()=>{const s=fixture();s.rows[0].key=0;assert.equal(search(s,q()).keys[0],0);});
test('Numbers in text search columns are rejected instead of silently formatted',()=>{const s=fixture();s.rows[0].values[1]=100;errorCode(()=>search(s,q()),'text');});
test('Cross-table model is blocked in this experiment',()=>{const s=fixture();s.fields=s.fields.map(f=>({...f}));s.fields[0].table='Other';errorCode(()=>search(s,q()),'schema');});
test('Zero results use a contradictory filter, never a clear or guessed ID',()=>{const filter=makeKeyFilter(keyTarget,search(fixture(),q('unfindable')));assert.equal(filter.logicalOperator,'And');assert.deepEqual(filter.conditions,[{operator:'IsBlank'},{operator:'IsNotBlank'}]);assert.equal(filter.values,undefined);});
test('OR results become one key In filter, not ANDed per-column text filters',()=>{const filter=makeKeyFilter(keyTarget,search(fixture(),q()));assert.equal(filter.operator,'In');assert.deepEqual(filter.values,[1,2,3,4,7]);assert.deepEqual(filter.target,keyTarget);});
test('Broad results fail before a filter is emitted',()=>{const s=fixture();s.rows=Array.from({length:LIMITS.matches+1},(_,i)=>({key:i,values:[String(i),'billy','S','HFB1']}));errorCode(()=>search(s,q()),'match-limit');});
test('Oversized UTF-8 filter payload is rejected',()=>errorCode(()=>makeKeyFilter(keyTarget,{query:q(),keys:['é'.repeat(LIMITS.payloadBytes)],scanned:1}),'payload-limit'));
test('100,000 candidates include a match beyond the first segment',()=>{const s=fixture();s.rows=Array.from({length:100000},(_,i)=>({key:i,values:[String(i),i===99999?'late billy':'ordinary','Supplier','HFB1']}));const begin=performance.now();assert.deepEqual(search(s,q()).keys,[99999]);console.log(`# Local synthetic 100k matching run: ${(performance.now()-begin).toFixed(1)} ms; excludes Power BI loading/rendering.`);});
test('Configured row guard is enforced',()=>{const s=fixture();s.rows=Array.from({length:100001},(_,i)=>({key:i,values:['x','ordinary','S','HFB1']}));errorCode(()=>search(s,q()),'row-limit');});
for(const count of [1,2,5,10]) test(`${count} search fields work in the pure matcher`,()=>{const fs=Array.from({length:count},(_,i)=>({table:'T',column:`F${i}`,displayName:`F${i}`,id:`f${i}`}));const s={fields:fs,keyTarget:{table:'T',column:'ID'},complete:true,rows:[{key:1,values:fs.map((_,i)=>i===count-1?'needle':'hay')}]};assert.deepEqual(search(s,q('needle',{fieldIds:fs.map(f=>f.id)})).keys,[1]);});
test('More than 10 fields fails clearly',()=>{const s=fixture();s.fields=Array.from({length:11},(_,i)=>({...fields[0],id:String(i)}));errorCode(()=>validateSnapshot(s),'fields');});
test('Semantic column expression wins over a renamed display label',()=>assert.deepEqual(resolveTarget({displayName:'My renamed field',queryName:'Wrong.Alias',expr:{source:{entity:'Correct table'},ref:'Actual column'}}),{table:'Correct table',column:'Actual column'}));
test('Unambiguous query name is supported as fallback',()=>assert.deepEqual(resolveTarget({displayName:'Name',queryName:'Articles.Actual name'}),{table:'Articles',column:'Actual name'}));
test('Ambiguous dotted names are rejected rather than guessed',()=>errorCode(()=>resolveTarget({displayName:'X',queryName:'A.B.C'}),'column-target'));
test('Measures are not accepted',()=>errorCode(()=>resolveTarget({displayName:'Sum',queryName:'T.Sum',isMeasure:true}),'measure'));
function table() {return {columns:[{displayName:'ID',queryName:'Articles.Record ID',roles:{recordKey:true},type:{numeric:true}},...fields.map(f=>({displayName:f.displayName,queryName:`${f.table}.${f.column}`,roles:{fields:true},type:{text:true}}))],rows:fixture().rows.map(r=>[r.key,...r.values])};}
test('Table reader resolves key and search columns by roles, not fixed indices',()=>{const t=table();t.columns=[...t.columns.slice(1),t.columns[0]];t.rows=t.rows.map(r=>[...r.slice(1),r[0]]);assert.deepEqual(search(readSnapshot(t,false),q()).keys,[1,2,3,4,7]);});
test('Segment flag propagates incomplete status',()=>assert.equal(readSnapshot(table(),true).complete,false));
test('Record key role is mandatory for the experiment',()=>{const t=table();t.columns[0].roles={};errorCode(()=>readSnapshot(t,false),'key-role');});
test('Mismatched numeric metadata and text values are rejected',()=>{const t=table();t.columns[1].type={numeric:true};errorCode(()=>readSnapshot(t,false),'search-value');});
test('Query equality ignores chip ordering',()=>assert.equal(sameQuery(q(),q('billy',{fieldIds:q().fieldIds.slice().reverse()})),true));
test('Controller keeps the last filter after a validation failure',()=>{const out=[];const c=new SearchController({apply:f=>out.push(f)});c.ingest(fixture(),true);c.submit(q());assert.equal(out.length,1);errorCode(()=>c.submit(q('x',{fieldIds:[]})),'scope');assert.equal(out.length,1);assert.equal(c.applied.text,'billy');});
test('Incomplete reads never trigger a host filter',()=>{const out=[];const c=new SearchController({apply:f=>out.push(f)});c.ingest({...fixture(),complete:false},true);errorCode(()=>c.submit(q()),'not-ready');assert.equal(out.length,0);});
test('Narrow then broad uses the full unchanged candidate snapshot',()=>{const out=[];const c=new SearchController({apply:f=>out.push(f)});c.ingest(fixture(),true);c.submit(q('oak'));c.submit(q('billy'));assert.deepEqual(out[1].values,[1,2,3,4,7]);});
test('Changed context discards old candidates and blocks until clear + fresh data',()=>{const out=[];const c=new SearchController({apply:f=>out.push(f)});c.ingest(fixture(),true);c.submit(q());const s=fixture();s.rows=s.rows.slice(2);c.ingest(s,true);assert.equal(c.canSearch,false);errorCode(()=>c.submit(q()),'not-ready');c.clear();assert.equal(out.at(-1),null);assert.equal(c.canSearch,false);c.ingest(s,false);assert.equal(c.canSearch,false);c.ingest(s,true);assert.equal(c.canSearch,true);assert.deepEqual(c.submit(q()).keys,[3,4,7]);});
test('Two instances own separate filter sinks and session state',()=>{const a=[],b=[];const one=new SearchController({apply:f=>a.push(f)}),two=new SearchController({apply:f=>b.push(f)});one.ingest(fixture(),true);two.ingest(fixture(),true);one.submit(q('oak'));two.submit(q('billy'));one.clear();assert.equal(two.applied.text,'billy');assert.equal(b.length,1);assert.equal(a.at(-1),null);});
test('Host exceptions do not commit the new query to session state',()=>{const c=new SearchController({apply:()=>{throw Error('host failure');}});c.ingest(fixture(),true);assert.throws(()=>c.submit(q()),/host failure/);assert.equal(c.applied,null);});
test('Missing/invalid data clears cached candidates',()=>{const c=new SearchController({apply:()=>{}});c.ingest(fixture(),true);c.invalidate('No data');assert.equal(c.canSearch,false);errorCode(()=>c.submit(q()),'not-ready');});

test('Unrestorable saved filters require explicit clear and fresh host data',()=>{const out=[];const c=new SearchController({apply:f=>out.push(f)});c.ingest(fixture(),true);c.markSavedFilter();assert.equal(c.canSearch,false);errorCode(()=>c.submit(q()),'not-ready');c.ingest(fixture(),true);assert.equal(c.canSearch,false);c.clear();assert.equal(c.canSearch,false);c.ingest(fixture(),true);assert.equal(c.canSearch,true);});
