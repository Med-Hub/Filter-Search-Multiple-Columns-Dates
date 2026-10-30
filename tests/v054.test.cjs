// 0.5.4 regressions: Mohamed's binding no longer blocks typing, theme colours,
// new Format pane options and typed dates in the options row.
const test=require('node:test'),assert=require('node:assert/strict');
const {readBindings}=require('../.core-build/powerbi/bindings.js');
const {readSnapshot}=require('../.core-build/powerbi/dataReader.js');
const {search}=require('../.core-build/core/matcher.js');
const {availableDates,parseDayText,stepDay,nearestDay,displayDay}=require('../.core-build/core/dates.js');
const {compactOptions,COMPACT_DEFAULTS,normaliseColour,safeFont,withSearchPreferences}=require('../.core-build/core/compactOptions.js');
const {readTheme,themeColourDefaults,lookTokens,contrast,mix,twoRowHeight,DEFAULT_THEME}=require('../.core-build/core/theme.js');

const col=(name,roles,type)=>({displayName:name,queryName:'Range.'+name,expr:{source:{entity:'Range'},ref:name},roles,type});
// The binding in Mohamed's screenshot: key Article No; Search fields Article No,
// Article Name, RU EDS, HFB; Date fields HFB (a text column).
const mohamed=()=>[col('Article No',{recordKey:true,fields:true},{numeric:true,integer:true}),col('Article Name',{fields:true},{text:true}),col('RU EDS',{fields:true},{dateTime:true}),col('HFB',{fields:true,dates:true},{text:true})];
const rows=[[60637328,'VINTERFINT candle',new Date(2027,0,1),'08'],[60637329,'VINTERFINT bauble',new Date(2027,0,1),'08'],[60637330,'STRÅLA lamp',new Date(2026,11,1),'10']];
const q=(s,text,over={})=>({text,fieldIds:s.fields.map(f=>f.id),mode:'contains',logic:'any',ignoreAccents:true,...over});

test('Mohamed’s binding: HFB in Date fields no longer blocks the search',()=>{
 const s=readSnapshot({columns:mohamed(),rows},false);
 assert.deepEqual(s.fields.map(f=>f.displayName),['Article No','Article Name','HFB']);
 assert.deepEqual(s.dateFields.map(f=>f.displayName),['RU EDS']);
 assert.deepEqual(search(s,q(s,'vinterfint')).keys,[60637328,60637329]);
});
test('Mohamed’s binding: HFB is still searched as text',()=>{const s=readSnapshot({columns:mohamed(),rows},false);assert.deepEqual(search(s,q(s,'10','exact')).keys,[60637330]);});
test('Mohamed’s binding: one plain notice explains HFB, nothing blocking',()=>{
 const b=readBindings(mohamed());assert.equal(b.keyError,undefined);
 assert.deepEqual(b.issues.map(i=>i.code),['date-type']);assert.match(b.issues[0].message,/HFB.*searched as text/);
});
test('Mohamed’s binding: RU EDS offers the dates Power BI shows',()=>{const s=readSnapshot({columns:mohamed(),rows},false);assert.deepEqual(availableDates(s)[0].days,['2026-12-01','2027-01-01']);});
test('A text column only in Date fields is searched instead of blocking',()=>{
 const cols=[col('ID',{recordKey:true},{numeric:true}),col('Name',{fields:true},{text:true}),col('Season',{dates:true},{text:true})];
 const s=readSnapshot({columns:cols,rows:[[1,'BILLY','Winter'],[2,'STRÅLA','Summer']]},false);
 assert.deepEqual(s.fields.map(f=>f.displayName),['Name','Season']);assert.deepEqual(search(s,q(s,'winter')).keys,[1]);
});
test('A second projection of the same column is searched once',()=>{
 const a=col('Name',{fields:true},{text:true}),b=readBindings([col('ID',{recordKey:true},{numeric:true}),a,{...a,roles:{dates:true}}]);
 assert.equal(b.search.length,1);assert.deepEqual(b.issues.map(i=>i.code),['date-type']);
});
test('More than ten search fields: the first ten are used, the rest named',()=>{
 const cols=[col('ID',{recordKey:true},{numeric:true}),...Array.from({length:12},(_,i)=>col('F'+i,{fields:true},{text:true}))],b=readBindings(cols);
 assert.equal(b.search.length,10);assert.equal(b.issues.filter(i=>i.code==='fields').length,2);
});
test('A missing Record key still blocks, with its own message',()=>{const cols=mohamed().map(c=>({...c,roles:{...c.roles,recordKey:false}}));assert.throws(()=>readSnapshot({columns:cols,rows},false),e=>e.code==='key-role');});

// ---------- Format pane options ----------
test('New defaults: small corners, search as you type, options row automatic',()=>{
 assert.equal(COMPACT_DEFAULTS.radius,4);assert.equal(COMPACT_DEFAULTS.autoSearch,true);assert.equal(COMPACT_DEFAULTS.layout,'auto');
 assert.equal(COMPACT_DEFAULTS.borderShow,true);assert.equal(COMPACT_DEFAULTS.borderWidth,1);assert.equal(COMPACT_DEFAULTS.fontSize,10);
});
for(const [input,out] of [['#abc','#AABBCC'],['#1e5a44','#1E5A44'],['rgb(30, 90, 68)','#1E5A44'],['rgba(0,0,0,0.5)','#000000'],['red',null],['#12345',null],['rgb(300,0,0)',null],['url(x)',null],[null,null]])test(`Colour ${input} → ${out}`,()=>assert.equal(normaliseColour(input),out));
test('Font stacks from the font picker are accepted',()=>assert.equal(safeFont("'Segoe UI', wf_segoe-ui_normal, helvetica, arial, sans-serif"),"'Segoe UI', wf_segoe-ui_normal, helvetica, arial, sans-serif"));
for(const bad of ['Arial; color:red','x{y}','url(http://a)','a'.repeat(201),''])test('Unsafe font value is refused: '+bad.slice(0,20),()=>assert.equal(compactOptions({fontFamily:bad}).fontFamily,COMPACT_DEFAULTS.fontFamily));
test('Placeholder text is trimmed, single-line and capped',()=>{assert.equal(compactOptions({placeholder:'  Zoek artikel…\n '}).placeholder,'Zoek artikel…');assert.equal(compactOptions({placeholder:'x'.repeat(200)}).placeholder.length,80);});
test('Unknown layout falls back to automatic',()=>assert.equal(compactOptions({layout:'popup'}).layout,'auto'));
test('Reader choices cannot change creator layout or style',()=>{
 const base=compactOptions({layout:'oneRow',showDate:false,borderShow:false,radius:0,accent:'#123456'});
 const after=withSearchPreferences(base,{layout:'auto',showDate:true,borderShow:true,radius:24,accent:'#FFFFFF',mode:'exact'});
 for(const k of ['layout','showDate','borderShow','radius','accent'])assert.equal(after[k],base[k],k);assert.equal(after.mode,'exact');
});

// ---------- theme ----------
const palette=(over={})=>{const colours=['#1E5A44','#E8A33D','#3A7CA5'];let next=0;const keys={};return {isHighContrast:false,foreground:{value:'#1B2A24'},background:{value:'#FFFFFF'},foregroundNeutralSecondary:{value:'#5D6B66'},foregroundNeutralTertiary:{value:'#A8B3AE'},backgroundLight:{value:'#EEF2F0'},backgroundNeutral:{value:'#C9D1CD'},negative:{value:'#C4314B'},getColor(k){if(!(k in keys))keys[k]=colours[next++%colours.length];return {value:keys[k]};},...over};};
test('Theme: first theme colour becomes the accent; structural colours map to text, border and hints',()=>{
 const t=readTheme(palette());assert.equal(t.accent,'#1E5A44');
 assert.deepEqual(themeColourDefaults(t),{background:'#FFFFFF',borderColor:'#A8B3AE',focusColor:'#1E5A44',textColor:'#1B2A24',secondaryColor:'#5D6B66',accent:'#1E5A44',iconColor:'#1E5A44'});
});
test('Theme: the accent stays the same on every update',()=>{const p=palette();assert.equal(readTheme(p).accent,readTheme(p).accent);});
test('Theme: missing palette falls back to Power BI’s default theme',()=>{const t=readTheme(undefined);assert.equal(t.accent,DEFAULT_THEME.accent);assert.equal(t.background,'#FFFFFF');});
test('Theme: a throwing getColor never breaks rendering',()=>assert.equal(readTheme(palette({getColor(){throw Error('x');}})).accent,DEFAULT_THEME.accent));
test('Theme: high contrast uses only the host foreground/background/selected colours',()=>{
 const t=readTheme(palette({isHighContrast:true,foreground:{value:'#FFFF00'},background:{value:'#000000'},foregroundSelected:{value:'#00FFFF'}}));
 const v=lookTokens(compactOptions({accent:'#1E5A44',textColor:'#123456',borderColor:'#ABCDEF'}),t);
 assert.equal(v['--ff-fg'],'#FFFF00');assert.equal(v['--ff-bg'],'#000000');assert.equal(v['--ff-border'],'#FFFF00');assert.equal(v['--ff-accent'],'#00FFFF');assert.equal(v['--ff-shadow'],'none');
});
test('Light theme accent (yellow) is never used for icon or text on white',()=>{
 const v=lookTokens(compactOptions({accent:'#F2C811',iconColor:'#F2C811',textColor:'#252423',background:'#FFFFFF'}),DEFAULT_THEME);
 assert.equal(v['--ff-accent'],'#F2C811');assert.equal(v['--ff-accent-text'],'#252423');assert.equal(v['--ff-icon'],'#252423');assert.equal(v['--ff-on-accent'],'#1B1B1B');
});
test('Dark theme: tints are lighter mixes, error text readable',()=>{
 const t=readTheme(palette({background:{value:'#1F1F1F'},foreground:{value:'#F3F3F3'},negative:{value:'#8A1C2B'}}));
 const v=lookTokens(compactOptions({background:'#1F1F1F',textColor:'#F3F3F3',accent:'#4CC2A0'}),t);
 assert.ok(contrast(v['--ff-error'],'#1F1F1F')>=4.5);assert.notEqual(v['--ff-soft'],'#1F1F1F');
});
test('Border off sets width 0; on uses the chosen width',()=>{assert.equal(lookTokens(compactOptions({borderShow:false}),DEFAULT_THEME)['--ff-bw'],'0px');assert.equal(lookTokens(compactOptions({borderWidth:3}),DEFAULT_THEME)['--ff-bw'],'3px');});
test('Text size is in points like Power BI and stays inside the row',()=>{assert.equal(lookTokens(compactOptions({fontSize:10}),DEFAULT_THEME)['--ff-size'],'13.3px');assert.equal(lookTokens(compactOptions({fontSize:18,barHeight:28}),DEFAULT_THEME)['--ff-size'],'16px');});
test('Two-row layout needs about 70 px with the default height',()=>{assert.equal(twoRowHeight(COMPACT_DEFAULTS),70);assert.ok(twoRowHeight(compactOptions({barHeight:28}))<=62);});
test('sRGB mix is exact at both ends',()=>{assert.equal(mix('#000000','#FFFFFF',0),'#FFFFFF');assert.equal(mix('#000000','#FFFFFF',1),'#000000');});

// ---------- typed dates in the options row ----------
for(const [text,day] of [['8 Oct 2026','2026-10-08'],['8 okt 2026','2026-10-08'],['8 oktober 2026','2026-10-08'],['Oct 8, 2026','2026-10-08'],['08/10/2026','2026-10-08'],['2026-10-08','2026-10-08'],['1 mrt 2027','2027-03-01'],['31 Sep 2026',null],['8 Foo 2026',null],['8 Oct 26',null]])test(`Typed date “${text}”`,()=>assert.equal(parseDayText(text),day));
test('Every label the field shows can be typed back',()=>{for(const day of ['2024-02-29','2026-01-01','2026-12-31'])assert.equal(parseDayText(displayDay(day,true)),day);});
const days=['2026-09-30','2026-10-08','2026-10-12','2026-10-31'];
test('‹ › step through dates that have rows',()=>{assert.equal(stepDay(days,'2026-10-08',1),'2026-10-12');assert.equal(stepDay(days,'2026-10-08',-1),'2026-09-30');assert.equal(stepDay(days,'2026-10-10',1),'2026-10-12');assert.equal(stepDay(days,'2026-10-31',1),'2026-10-31');assert.equal(stepDay(days,'2026-09-30',-1),'2026-09-30');});
test('Without a catalogue, steps move one day',()=>assert.equal(stepDay([],'2026-12-31',1),'2027-01-01'));
test('The editor opens on the date with rows closest to today',()=>{assert.equal(nearestDay(days,'2026-10-09'),'2026-10-08');assert.equal(nearestDay(days,'2026-10-10'),'2026-10-12');assert.equal(nearestDay([],'2026-10-10'),null);});

// Review fixes (0.5.4 release candidate).
const {prepareSearch}=require('../.core-build/core/matcher.js');
const {SearchController}=require('../.core-build/core/controller.js');
const bigTable=n=>({columns:[col('Key',{recordKey:true},{numeric:true}),col('Name',{fields:true},{text:true}),col('Supplier',{fields:true},{text:true})],
  rows:Array.from({length:n},(_,i)=>[i+1,(i%97===0?'Crème ':'Article ')+i,'Supplier '+(i%300)])});
const q2=(s,text,extra={})=>({text,fieldIds:s.fields.map(f=>f.id),mode:'contains',logic:'any',ignoreAccents:true,...extra});
test('Cached search gives the same results as a fresh snapshot, for each accent setting',()=>{
  const a=readSnapshot(bigTable(3000),false),b=readSnapshot(bigTable(3000),false);
  prepareSearch(a);
  for(const [text,extra] of [['creme',{}],['crème',{ignoreAccents:false}],['creme',{ignoreAccents:false}],['supplier 7',{mode:'startsWith'}],['article 12',{logic:'all'}]])
    assert.deepEqual(search(a,q2(a,text,extra)),search(b,q2(b,text,extra)));
});
test('Rows added to a searched snapshot are seen by the next search',()=>{
  const s=readSnapshot(bigTable(10),false);assert.deepEqual(search(s,q2(s,'zzz')).keys,[]);
  s.rows=[...s.rows,{key:99,values:['zzz','x']}];assert.deepEqual(search(s,q2(s,'zzz')).keys,[99]);
});
test('Typing on 50,000 rows: searches after the first are fast',()=>{
  const s=readSnapshot(bigTable(50000),false);prepareSearch(s);
  const begin=performance.now();for(const t of ['a','ar','art','arti','artic']){try{search(s,q2(s,t));}catch{}}
  const each=(performance.now()-begin)/5;console.log(`# 50k rows, per keystroke search: ${each.toFixed(1)} ms`);assert.ok(each<120);
});
test('An identical data echo keeps the controller snapshot (and its search cache)',()=>{
  const c=new SearchController({apply(){}});const a=readSnapshot(bigTable(20),false);c.ingest(a,true);c.submit(q2(a,'article 1'));
  c.ingest(readSnapshot(bigTable(20),false),true);assert.equal(c.currentSnapshot,a);assert.equal(c.needsRefresh,false);
  c.ingest(readSnapshot(bigTable(19),false),true);assert.equal(c.needsRefresh,true);
});
test('Accent text reaches 4.5:1 on the background and on the selected tint',()=>{
  for(const accent of ['#118DFF','#1AAB40','#E66C37','#F2C811','#744EC2']){
    const k=lookTokens({...COMPACT_DEFAULTS,accent},DEFAULT_THEME);
    for(const bg of ['#FFFFFF',k['--ff-accent-soft'],k['--ff-soft']])assert.ok(contrast(k['--ff-accent-text'],bg)>=4.5,accent+' on '+bg);
  }
  assert.equal(lookTokens({...COMPACT_DEFAULTS},DEFAULT_THEME)['--ff-accent-text'],'#0D6ABF');
});
test('A dark bar background with the theme’s dark text stays readable',()=>{
  const k=lookTokens({...COMPACT_DEFAULTS,background:'#252423'},DEFAULT_THEME);
  assert.ok(contrast(k['--ff-fg'],'#252423')>=4.5&&contrast(k['--ff-muted'],'#252423')>=4.5);
  const own=lookTokens({...COMPACT_DEFAULTS,textColor:'#5A2D82'},DEFAULT_THEME);assert.equal(own['--ff-fg'],'#5A2D82');
});
