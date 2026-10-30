const {test}=require('node:test');
const assert=require('node:assert/strict');
const fixture=require('../sample/release-kit/fixture.json');
const cases=require('../sample/release-kit/Expected_Results.json');
const {readSnapshot}=require('../.core-build/powerbi/dataReader');
const {search,validateSnapshot}=require('../.core-build/core/matcher');
const {makeKeyFilter}=require('../.core-build/core/filter');
function snapshot(context){
 const columns=fixture.columns.map(name=>({displayName:name,queryName:fixture.table+'.'+name,expr:{source:{entity:fixture.table},ref:name},
  type:name==='ArticleNo'?{numeric:true,integer:true}:name==='UnitPrice'?{numeric:true}:['DeliveryDate','StartDate'].includes(name)?{dateTime:true}:{text:true},
  roles:name==='RecordKey'?{recordKey:true}:['DeliveryDate','StartDate'].includes(name)?{dates:true}:{fields:true}}));
 const rows=fixture.rows.filter(row=>!context||Object.entries(context).every(([key,value])=>row[fixture.columns.indexOf(key)]===value));
 return readSnapshot({columns,rows},false);
}
for(const c of cases)test('Release sample '+c.id+': '+c.name,()=>{
 const s=snapshot(c.context);const ids=c.fields.map(name=>s.fields.find(f=>f.displayName===name).id);
 const d=c.date?{...c.date,fieldId:s.dateFields.find(f=>f.displayName===c.date.field).id}:null;
 if(d)delete d.field;
 const q={text:c.text,fieldIds:ids,mode:c.mode,logic:c.logic,ignoreAccents:c.ignoreAccents,date:d};
 const result=search(s,q);assert.deepEqual(result.keys,c.expectedRecordKeys);
 if(c.expectedRecordKeys.length===0){const filter=makeKeyFilter(s.keyTarget,result);assert.equal(filter.logicalOperator,'And');assert.deepEqual(filter.conditions,[{operator:'IsBlank'},{operator:'IsNotBlank'}]);}
});
test('Release sample has unique stable row keys and valid date/numeric values',()=>{const s=snapshot();assert.doesNotThrow(()=>validateSnapshot(s));assert.equal(new Set(s.rows.map(r=>r.key)).size,s.rows.length);});
test('Release sample demonstrates why ArticleNo alone is not a delivery key',()=>{const s=snapshot();s.rows=s.rows.map((r,i)=>({...r,key:fixture.rows[i][1]}));assert.throws(()=>validateSnapshot(s),/key/i);});
