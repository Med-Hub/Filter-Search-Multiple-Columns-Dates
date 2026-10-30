const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const modulePromise=import('../scripts/certification-contract.mjs');
for(const [name,v,affected]of [
 ['braces','3.0.3',true],['braces','3.0.3-beta.1',true],['braces','2.3.2',true],['braces','3.0.4',false],['braces','unknown',true],
 ['uuid','8.3.2',true],['uuid','11.1.0',true],['uuid','11.1.1',false],['uuid','11.1.1-beta.1',true],['uuid','12.0.0',true],['uuid','12.0.1',false],['uuid','13.0.0',true],['uuid','13.0.1',false],['uuid','14.0.0',false],['uuid','',true]
])test(`Offline dependency guard ${name}@${v||'<missing>'}`,async()=>{const {knownDependencyFindings}=await modulePromise;assert.equal(knownDependencyFindings({packages:{['node_modules/a/node_modules/'+name]:{version:v}}}).length>0,affected);});
for(const [name,exit,output,passed]of [
 ['clean full report',0,JSON.stringify({metadata:{vulnerabilities:{moderate:0,high:0,critical:0,low:2}}}),true],
 ['high finding',0,JSON.stringify({metadata:{vulnerabilities:{moderate:0,high:1,critical:0}}}),false],
 ['moderate finding',1,JSON.stringify({metadata:{vulnerabilities:{moderate:1,high:0,critical:0}}}),false],
 ['critical finding',1,JSON.stringify({metadata:{vulnerabilities:{moderate:0,high:0,critical:1}}}),false],
 ['network failure',1,JSON.stringify({error:{code:'EAI_AGAIN'}}),false],
 ['missing counts',0,'{}',false],['bad JSON',0,'not json',false],
 ['unknown counts',0,JSON.stringify({metadata:{vulnerabilities:{moderate:0,high:'0',critical:0}}}),false],
 ['failed process with zero counts',1,JSON.stringify({metadata:{vulnerabilities:{moderate:0,high:0,critical:0}}}),false]
])test('Audit assessment: '+name,async()=>{assert.equal((await modulePromise).auditAssessment(exit,output).passed,passed);});
test('Root manifest comparison ignores harmless JSON property order',async()=>assert.equal((await modulePromise).equivalent({b:2,a:1},{a:1,b:2}),true));
test('Missing or skipped gates never permit a release',async()=>{const {releaseReady}=await modulePromise;assert.equal(releaseReady([{name:'audit',status:'skipped'}],['audit']),false);assert.equal(releaseReady([],['audit']),false);assert.equal(releaseReady([{name:'audit',status:'passed'}],['audit']),true);});
test('Affected-tree fixture stays blocked without depending on the project remaining vulnerable',async()=>{const {inspectCertificationInputs}=await modulePromise;const p={version:'1.0.0',scripts:{eslint:'eslint .'},dependencies:{'powerbi-visuals-api':'5.4.0'},devDependencies:{typescript:'5.9.3',eslint:'10.12.0','eslint-plugin-powerbi-visuals':'1.1.1'}};const l={packages:{'':{version:p.version,dependencies:p.dependencies,devDependencies:p.devDependencies},'node_modules/braces':{version:'3.0.3'},'node_modules/uuid':{version:'8.3.2'}}};const r=inspectCertificationInputs(p,{apiVersion:'5.4.0'},l,{apiVersion:'5.11.1'});assert.equal(r.readyForReleasePipeline,false);assert.ok(r.dependencies.some(d=>d.package==='braces'));assert.ok(r.dependencies.some(d=>d.package==='uuid'));});
test('Release package cannot silently use the SDK test-build switch',()=>{const src=fs.readFileSync(path.join(__dirname,'../scripts/collect-certification.mjs'),'utf8');assert.equal(src.includes('--test-build'),false);assert.ok(src.includes('--include=dev'));});
test('Cloud workflow is manual, read-only and SHA-pinned',()=>{const y=fs.readFileSync(path.join(__dirname,'../.github/workflows/certification-checks.yml'),'utf8');assert.ok(y.includes('workflow_dispatch:'));assert.ok(y.includes('contents: read'));assert.ok(y.includes('persist-credentials: false'));assert.equal(y.includes('pull_request_target'),false);assert.equal(y.includes('secrets.'),false);for(const [,ref]of y.matchAll(/uses:\s+([^\n]+)/g))assert.match(ref.trim(),/^actions\/[a-z-]+@[a-f0-9]{40}$/);});
test('Cloud candidate upload references exact final report, not a dist glob',()=>{const y=fs.readFileSync(path.join(__dirname,'../.github/workflows/certification-checks.yml'),'utf8');assert.ok(y.includes('report.finalSHA256'));assert.ok(y.includes('report.testBuild'));assert.equal(y.includes('dist/*.pbiviz'),false);});
test('Host-only SDK harness never rewrites the production licence constant',()=>{const p=fs.readFileSync(path.join(__dirname,'../scripts/test-release-smoke.py'),'utf8');assert.ok(p.includes('FF_LICENSE_HOST_PLAN_ID'));assert.equal(p.includes("env['FF_LICENSE_TEST_PLAN_ID'] ="),false);assert.ok(p.includes("'modifiedPackageCode': False"));});
