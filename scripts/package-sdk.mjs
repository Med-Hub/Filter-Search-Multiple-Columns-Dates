/** Auditable connected-machine build. SDK runtime dependencies come from npm,
 * NEVER from extracted vendor factories. The DOM transform is part of this
 * declared build command, so reviewers can reproduce the exact artifact.
 */
import {readFile,writeFile,readdir,stat,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createRequire} from 'node:module';
import {resourcePath,validateArtifact} from './artifact-contract.mjs';
const require=createRequire(import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
const {scanApplication,hardenVendorHtml}=require('./cert-security.cjs');
const args=process.argv.slice(2);
if(args.length>1 || args.length===1&&args[0]!=='--test-build')throw Error('Usage: node scripts/package-sdk.mjs [--test-build]');
const testBuild=args.includes('--test-build');
const run=(file,args=[])=>{const r=spawnSync(process.execPath,[file,...args],{cwd:root,stdio:'inherit'});if(r.error||r.status!==0)throw Error('Build stage failed: '+path.basename(file));};
const sha=x=>createHash('sha256').update(x).digest('hex');
run('scripts/check-licensing.mjs',testBuild?['--allow-unconfigured']:[]);
run('scripts/check-installed-toolchain.mjs');
if(!testBuild){
    // Direct invocation must not bypass the same release precheck and full audit.
    run('scripts/check-certification.mjs');
    const cli=process.platform==='win32'?'npm.cmd':'npm';
    const audit=spawnSync(cli,['audit','--include=dev','--audit-level=moderate','--json'],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024,timeout:60000,shell:process.platform==='win32'});
    const {auditAssessment}=await import('./certification-contract.mjs');
    const verdict=auditAssessment(audit.status,audit.stdout||'');
    if(audit.error||!verdict.passed)throw Error('Release blocked: '+verdict.reason);
}

if(scanApplication(root).length)throw Error('Application contains forbidden runtime calls; it will NOT be silently transformed.');
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
const pbi=JSON.parse(await readFile(path.join(root,'pbiviz.json'),'utf8'));
const dist=path.join(root,'dist');await mkdir(dist,{recursive:true});
const before={};for(const n of await readdir(dist))if(n.endsWith('.pbiviz'))before[n]=(await stat(path.join(dist,n))).mtimeMs;
run('node_modules/powerbi-visuals-tools/bin/pbiviz.js',['package','--certification-audit']);
const fresh=[];for(const n of await readdir(dist))if(n.endsWith('.pbiviz')&&(!before[n]||before[n]<(await stat(path.join(dist,n))).mtimeMs))fresh.push(n);
if(fresh.length!==1)throw Error('Expected exactly one fresh SDK .pbiviz, not stale dist output.');
const JSZip=require('jszip');
const raw=await readFile(path.join(dist,fresh[0]));const zip=await JSZip.loadAsync(raw);
const outer=JSON.parse(await zip.file('package.json').async('string'));
const resourceFile=resourcePath(outer);
if(!zip.file(resourceFile))throw Error('Visual resource is missing from the archive.');
const resource=JSON.parse(await zip.file(resourceFile).async('string'));
const capabilities=JSON.parse(await readFile(path.join(root,'capabilities.json'),'utf8'));
const expectedIcon='data:image/png;base64,'+(await readFile(path.join(root,pbi.assets.icon))).toString('base64');
validateArtifact({outer,resource,manifest:pbi,capabilities,packageVersion:pkg.version,expectedIcon});
const hardened=hardenVendorHtml(resource.content.js);resource.content.js=hardened.code;
zip.file(resourceFile,JSON.stringify(resource));
for(const f of Object.values(zip.files))f.date=new Date('1980-01-01T00:00:00Z');
const output=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:9}});
const name=`Filter_Search_${pkg.version}${testBuild?'_NOT_FOR_APPSOURCE_Test':''}.pbiviz`;
const inputHashes={};
for(const f of ['package.json','package-lock.json','pbiviz.json','capabilities.json','config/licensing.json','scripts/package-sdk.mjs','scripts/cert-security.cjs'])inputHashes[f]=sha(await readFile(path.join(root,f)));
const applicationHashes={};
async function walkSource(dir){for(const item of await readdir(dir,{withFileTypes:true})){const f=path.join(dir,item.name);if(item.isDirectory())await walkSource(f);else applicationHashes[path.relative(root,f).split(path.sep).join('/')]=sha(await readFile(f));}}
await walkSource(path.join(root,'src'));
const commit=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'});
const artifactIdentity={inputHashes,applicationHashes,sourceCommit:commit.status===0?commit.stdout.trim():null,compiledJavascriptSHA256:sha(resource.content.js),compiledCssSHA256:sha(resource.content.css)};
await writeFile(path.join(dist,name),output);
await writeFile(path.join(dist,'SDK_BUILD_REPORT.json'),JSON.stringify({...artifactIdentity,version:pkg.version,testBuild,buildCommand:'node scripts/package-sdk.mjs'+(testBuild?' --test-build':''),apiVersion:pbi.apiVersion,rawSDKPackage:fresh[0],rawSHA256:sha(raw),finalFile:name,finalSHA256:sha(output),rawHtmlAssignmentsDisabled:hardened.edits.length,transform:hardened.edits,desktopVerified:false,microsoftCertified:false},null,2)+'\n');
console.log(name+(testBuild?' — ENGINEERING TEST ONLY. Not for AppSource.':' — release candidate produced, not a certification award; host validation remains required.'));
