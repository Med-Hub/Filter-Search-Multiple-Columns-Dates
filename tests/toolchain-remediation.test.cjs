const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const project=path.join(__dirname,'..');
const mod=import('../scripts/artifact-contract.mjs');
const probe=import('../scripts/check-installed-toolchain.mjs');
function fixture(){const visual={guid:'fieldFindTest',version:'0.6.2.0',name:'fieldFindTest',displayName:'Filter & Search'};const author={name:'Test publisher'};const capabilities={privileges:[],dataRoles:[]};const icon='data:image/png;base64,TEST_FIXTURE';return {
 manifest:{visual,author,apiVersion:'5.11.1'},capabilities,packageVersion:'0.6.2',expectedIcon:icon,
 outer:{version:'0.6.2.0',visual:{...visual},author:{...author},resources:[{resourceId:'rId0',sourceType:5,file:'resources/example.pbiviz.json'}],metadata:{pbivizjson:{resourceId:'rId0'}}},
 resource:{visual:{...visual},author:{...author},apiVersion:'5.11.1',capabilities:structuredClone(capabilities),externalJS:[],content:{js:'var visual = {};',css:'.visual {display:block}',iconBase64:icon}}
};}
test('Artifact contract accepts an internally matching package fixture',async()=>{assert.equal((await mod).validateArtifact(fixture()).version,'0.6.2.0');});
for(const [label,mutate]of [
 ['outer version',f=>f.outer.version='0.6.1.0'],['inner version',f=>f.resource.visual.version='0.6.1.0'],
 ['wrong API',f=>f.resource.apiVersion='5.4.0'],['wrong GUID',f=>f.resource.visual.guid='other'],
 ['outer publisher',f=>f.outer.author.name='Other'],['inner publisher',f=>f.resource.author.name='Other'],
 ['changed capabilities',f=>f.resource.capabilities.dataRoles=[{name:'other'}]],
 ['missing compiled JS',f=>f.resource.content.js=''],['missing compiled CSS',f=>f.resource.content.css=''],
 ['wrong icon',f=>f.resource.content.iconBase64='different'],['external script',f=>f.resource.externalJS=['https://test.invalid/a.js']],
 ['altered source package version',f=>f.packageVersion='0.6.3'],
 ['wrong resource id',f=>f.outer.metadata.pbivizjson.resourceId='wrong'],
 ['duplicated resource',f=>f.outer.resources.push({...f.outer.resources[0]})],
 ['external privilege even with matching manifests',f=>{f.capabilities.privileges=[{name:'WebAccess'}];f.resource.capabilities=structuredClone(f.capabilities);}]
])test('Artifact contract rejects '+label,async()=>{const f=fixture();mutate(f);const {validateArtifact}=await mod;assert.throws(()=>validateArtifact(f));});
for(const file of ['../bad.pbiviz.json','resources/../bad.pbiviz.json','https://example.invalid/visual.pbiviz.json','/resources/a.pbiviz.json','resources\\a.pbiviz.json','resources/a.json'])test('Resource path rejects '+file,async()=>{const f=fixture();f.outer.resources[0].file=file;const {resourcePath}=await mod;assert.throws(()=>resourcePath(f.outer));});
test('UUID check validates the no-argument v4 shape with an isolated fixture (not installed-tree proof)',async()=>{let n=0;const {probeUuid}=await probe;assert.equal(probeUuid({v4:()=>String(++n),validate:()=>true,version:()=>4},16).generated,16);});
for(const [label,api]of [['missing API',{}],['wrong version',{v4:()=> 'a',validate:()=>true,version:()=>3}],['invalid uuid',{v4:()=> 'a',validate:()=>false,version:()=>4}],['duplicate outputs',{v4:()=> 'a',validate:()=>true,version:()=>4}]])test('Installed UUID probe fails on '+label,async()=>{const {probeUuid}=await probe;assert.throws(()=>probeUuid(api));});
test('Manifest narrows UUID override to the reviewed SockJS version',()=>{const p=JSON.parse(fs.readFileSync(path.join(project,'package.json'),'utf8'));assert.deepEqual(p.overrides,{'sockjs@0.3.24':{uuid:'11.1.1'}});});
test('Real regenerated lock matches both retrieved registry versions and checksums',()=>{const p=JSON.parse(fs.readFileSync(path.join(project,'package-lock.json'),'utf8'));assert.equal(p.packages['node_modules/powerbi-visuals-api'].version,'5.11.1');assert.equal(p.packages['node_modules/powerbi-visuals-api'].integrity,'sha512-sAdzhUPEXylS3ad+RSoU+RmkT6KguoEo0DJ0SsSt0TOSpQH2vI3nPmXusb2RWH3XpsB7UufYV+d4Cgp0OMAKFw==');assert.equal(p.packages['node_modules/uuid'].version,'11.1.1');assert.equal(p.packages['node_modules/uuid'].integrity,'sha512-vIYxrBCC/N/K+Js3qSN88go7kIfNPssr/hHCesKCQNAjmgvYS2oqr69kIufEG+O4+PfezOH4EbIeHCfFov8ZgQ==');});
test('No older nested UUID remains in the lock',()=>{const p=JSON.parse(fs.readFileSync(path.join(project,'package-lock.json'),'utf8'));for(const [location,entry]of Object.entries(p.packages))if(/node_modules\/uuid$/.test(location))assert.equal(entry.version,'11.1.1');});
test('Current braces blocker is not hidden by UUID remediation',async()=>{const {knownDependencyFindings}=await import('../scripts/certification-contract.mjs');const p=JSON.parse(fs.readFileSync(path.join(project,'package-lock.json'),'utf8'));assert.ok(knownDependencyFindings(p).some(f=>f.package==='braces'));assert.equal(knownDependencyFindings(p).some(f=>f.package==='uuid'),false);});
test('Manifest preserves unconfigured licensing; no test service ID is inserted',()=>{const c=JSON.parse(fs.readFileSync(path.join(project,'config/licensing.json'),'utf8'));assert.equal(c.servicePlanId,'');});
test('Engineering workflow is explicit, marked, and keeps diagnostics failures visible',()=>{const y=fs.readFileSync(path.join(project,'.github/workflows/certification-checks.yml'),'utf8');assert.ok(y.includes('options: [diagnose, sdk-test, release]'));assert.ok(y.includes('NOT-FOR-APPSOURCE-sdk-test'));assert.ok(y.includes('Keep unresolved diagnostics red'));assert.ok(y.includes("steps.diagnostics.outcome != 'success'"));assert.ok(y.includes('npm run package:sdk:test'));});
test('Review source export writes its status BEFORE hashing every file',()=>{const s=fs.readFileSync(path.join(project,'scripts/export-certification.mjs'),'utf8');assert.ok(s.indexOf("await writeFile(path.join(out,'CERTIFICATION_STATUS.md')")<s.indexOf('await walk(out)'));assert.ok(s.includes("'verify-source.mjs'"));});
test('SDK packager validates the actual embedded capability and publisher contract',()=>{const s=fs.readFileSync(path.join(project,'scripts/package-sdk.mjs'),'utf8');assert.ok(s.includes('validateArtifact({outer,resource,manifest:pbi,capabilities,packageVersion:pkg.version,expectedIcon})'));assert.ok(s.includes('applicationHashes'));assert.ok(s.includes('inputHashes'));assert.ok(s.includes('_NOT_FOR_APPSOURCE_Test'));});
