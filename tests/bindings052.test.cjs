const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {readBindings,isHierarchyColumn}=require('../.core-build/powerbi/bindings.js');
const {readSnapshot}=require('../.core-build/powerbi/dataReader.js');
const {search}=require('../.core-build/core/matcher.js');
const col=(name,roles,type={text:true},table='Articles')=>({displayName:name,queryName:table+'.'+name,expr:{ref:name,source:{entity:table}},roles,type});
const key=()=>col('Article No',{recordKey:true,fields:true},{numeric:true});
const name=()=>col('Article Name',{fields:true});
const hierarchy=level=>({displayName:level,queryName:`Articles.Next Delivery.Date Hierarchy.${level}`,expr:{level,arg:{hierarchy:'Date Hierarchy'}},roles:{fields:true},type:level==='Month'?{text:true}:{numeric:true}});
const query=text=>({text,fieldIds:[JSON.stringify(['Articles','Article Name'])],mode:'contains',logic:'any',ignoreAccents:true});
for(const level of ['Year','Quarter','Month','Day'])test('Hierarchy '+level+' does not erase the two valid search columns',()=>{
 const cols=[key(),name(),hierarchy(level)],b=readBindings(cols);
 assert.equal(b.search.length,2);assert.equal(b.issues.length,1);assert.equal(b.issues[0].code,'date-hierarchy');
 const s=readSnapshot({columns:cols,rows:[[60637328,'STRÅLA',level==='Month'?'October':2026],[60637329,'BILLY',null]]},false);
 assert.deepEqual(s.fields.map(f=>f.displayName),['Article No','Article Name']);assert.deepEqual(search(s,query('STRALA')).keys,[60637328]);
});
test('Full Year Quarter Month Day projections are ignored, not guessed into dates',()=>{
 const cols=[key(),name(),...['Year','Quarter','Month','Day'].map(hierarchy)],s=readSnapshot({columns:cols,rows:[[1,'STRÅLA',2026,'Q4','October',8]]},false);
 assert.equal(s.fields.length,2);assert.equal(s.dateFields?.length||0,0);assert.equal(readBindings(cols).issues.length,4);
});
test('Plain date in Search fields automatically appears in Date fields',()=>{
 const cols=[key(),name(),col('Next Delivery',{fields:true},{dateTime:true})];const s=readSnapshot({columns:cols,rows:[[1,'STRÅLA',new Date('2026-10-08T15:00:00Z')]]},false);
 assert.deepEqual(s.fields.map(f=>f.displayName),['Article No','Article Name']);assert.equal(s.dateFields[0].displayName,'Next Delivery');assert.deepEqual(s.rows[0].dates,['2026-10-08']);
});
test('Date filtering works after routing plain Date from the Search well',()=>{
 const cols=[key(),name(),col('Next Delivery',{fields:true},{dateTime:true})],s=readSnapshot({columns:cols,rows:[[1,'STRÅLA','2026-10-08'],[2,'STRÅLA','2026-10-09']]},false);
 assert.deepEqual(search(s,{...query('STRALA'),date:{fieldId:s.dateFields[0].id,condition:'on',from:'2026-10-08'}}).keys,[1]);
});
test('Plain Date in its optional date well keeps normal behaviour',()=>{
 const cols=[key(),name(),col('Next Delivery',{dates:true},{dateTime:true})],s=readSnapshot({columns:cols,rows:[[1,'STRÅLA','2026-10-08']]},false);
 assert.equal(s.dateFields.length,1);assert.equal(s.fields.length,2);
});
test('One actual Date column carrying both roles is added once as a date',()=>{
 const cols=[key(),name(),col('Next Delivery',{dates:true,fields:true},{dateTime:true})];assert.equal(readSnapshot({columns:cols,rows:[[1,'STRÅLA',null]]},false).dateFields.length,1);
});
test('Plain dates remain available beside a bad hierarchy',()=>{
 const cols=[key(),name(),hierarchy('Year'),col('Next Delivery',{dates:true},{dateTime:true})];const s=readSnapshot({columns:cols,rows:[[1,'STRÅLA',2026,'2026-10-08']]},false);assert.equal(s.dateFields.length,1);assert.equal(s.fields.length,2);
});
test('An ordinary same-table numeric Year column is not mistaken for a hierarchy',()=>{
 const c=col('Year',{fields:true},{numeric:true});assert.equal(isHierarchyColumn(c),false);assert.equal(readSnapshot({columns:[key(),c],rows:[[1,2026]]},false).fields.length,2);
});
test('Auto-date table numeric Year is explicitly recognised as a hierarchy projection',()=>{
 const c=col('Year',{fields:true},{numeric:true},'LocalDateTable_12345');assert.equal(isHierarchyColumn(c),true);assert.equal(readBindings([key(),name(),c]).search.length,2);
});
test('Missing key prevents filtering but does not hide the assigned search labels',()=>{
 const b=readBindings([name()]);assert.equal(b.search.length,1);assert.equal(b.keyError.code,'key-role');assert.throws(()=>readSnapshot({columns:[name()],rows:[['STRÅLA']]},false),e=>e.code==='key-role');
});
test('Invalid row values fail closed without changing discoverable field labels',()=>{
 const cols=[key(),name()];assert.throws(()=>readSnapshot({columns:cols,rows:[[null,'STRÅLA']]},false));assert.equal(readBindings(cols).search.length,2);
});
test('Metadata-only views can show the assigned field names',()=>assert.equal(readBindings([key(),name()]).search.length,2));
test('Removing a column removes its metadata instead of retaining an old stale list',()=>assert.deepEqual(readBindings([key()]).search.map(x=>x.field.displayName),['Article No']));
test('An unresolved hierarchy cannot be emitted as a column-target filter',()=>{
 const bad={displayName:'Next Delivery (Year)',roles:{fields:true},queryName:'Articles.Next Delivery.Year',type:{numeric:true}};
 const s=readSnapshot({columns:[key(),name(),bad],rows:[[1,'STRÅLA',2026]]},false);assert.equal(s.fields.length,2);assert.equal(readBindings([key(),name(),bad]).issues[0].code,'column-target');
});
test('Hierarchy-only binding fails with explanation instead of searching periods as dates',()=>assert.throws(()=>readSnapshot({columns:[col('ID',{recordKey:true},{numeric:true}),hierarchy('Year')],rows:[[1,2026]]},false),e=>e.code==='date-hierarchy'));
test('Mixed-type key values still fail closed',()=>assert.throws(()=>readSnapshot({columns:[key(),name()],rows:[[1,'one'],['2','two']]},false),e=>e.code==='key-type'));
test('Invalid date serials are never reconstructed as real dates',()=>assert.throws(()=>readSnapshot({columns:[key(),name(),col('Delivery',{dates:true},{dateTime:true})],rows:[[1,'one',45000]]},false),e=>e.code==='date-value'));
test('No production TypeScript invokes automatic focus mode',()=>{
 const root=path.resolve(__dirname,'../src');const files=[];function scan(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,d.name);if(d.isDirectory())scan(p);else if(/\.tsx?$/.test(p))files.push(p);}}scan(root);
 assert.equal(files.some(p=>fs.readFileSync(p,'utf8').includes('switchFocusModeState')),false);
});
test('Search and Date wells accept a plain Date without schema-invalid dateTime types (0.5.3)',()=>{
 // API 5.4's capabilities schema has no dateTime value type: 0.5.2's
 // {dateTime:true} entries made the official packager stop with "Invalid capabilities".
 // Like Microsoft's Timeline, these roles declare no type list; bindings.ts validates types.
 const c=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../capabilities.json')));
 for(const name of ['fields','dates']){const r=c.dataRoles.find(r=>r.name===name);assert.equal(r.requiredTypes,undefined,name);assert.equal(r.preferredTypes,undefined,name);}
 assert.equal(JSON.stringify(c).includes('"dateTime"'),false);
});
