/** Atomic manifest/lock update. Registry resolution happens in a temporary
 * directory first. A failed network request leaves the project untouched.
 * No invented integrity hashes or in-place hand-edited dependency versions.
 */
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const files=['package.json','package-lock.json','pbiviz.json'];
const before=await Promise.all(files.map(p=>readFile(path.join(root,p),'utf8')));
const target=JSON.parse(await readFile(path.join(root,'config/toolchain-targets.json'),'utf8'));
if(!/^\d+\.\d+\.\d+$/.test(target.apiVersion))throw Error('Invalid reviewed API target');
let stage;
try{
 stage=await mkdtemp(path.join(tmpdir(),'filter-search-api-'));
 await writeFile(path.join(stage,'package.json'),before[0]);await writeFile(path.join(stage,'package-lock.json'),before[1]);
 const cmd=process.platform==='win32'?'npm.cmd':'npm';
 const result=spawnSync(cmd,['install','--package-lock-only','--ignore-scripts','--no-audit','--no-fund','--fetch-retries=0','--fetch-timeout=15000','--save-exact','powerbi-visuals-api@'+target.apiVersion],{cwd:stage,stdio:'inherit',timeout:60000,shell:process.platform==='win32'});
 if(result.error||result.status!==0)throw Error('Registry-backed API update failed; project manifests and lockfile were not changed.');
 const pkg=JSON.parse(await readFile(path.join(stage,'package.json'),'utf8'));
 const lock=JSON.parse(await readFile(path.join(stage,'package-lock.json'),'utf8'));
 const entry=lock.packages?.['node_modules/powerbi-visuals-api'];
 if(pkg.dependencies?.['powerbi-visuals-api']!==target.apiVersion||entry?.version!==target.apiVersion||!entry.integrity)throw Error('Resolved API lock did not match the requested exact version.');
 const current=await Promise.all(files.map(p=>readFile(path.join(root,p),'utf8')));
 if(current.some((v,i)=>v!==before[i]))throw Error('Project files changed while resolving the API; refusing to overwrite.');
 const visual=JSON.parse(before[2]);visual.apiVersion=target.apiVersion;
 // Synchronous writes are deliberately avoided during network work; backups
 // allow recovery even from a filesystem failure while committing these files.
 const backup=path.join(root,'build-logs','api-upgrade-backup');
 const {mkdir}=await import('node:fs/promises');await mkdir(backup,{recursive:true});
 for(let i=0;i<files.length;i++)await writeFile(path.join(backup,files[i]),before[i]);
 await writeFile(path.join(root,'package.json'),JSON.stringify(pkg,null,2)+'\n');
 await writeFile(path.join(root,'package-lock.json'),JSON.stringify(lock,null,2)+'\n');
 await writeFile(path.join(root,'pbiviz.json'),JSON.stringify(visual,null,2)+'\n');
 console.log('API/lock updated to '+target.apiVersion+'. Run npm ci, full typecheck, lint, tests and audit; this is not host validation.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{if(stage)await rm(stage,{recursive:true,force:true});}
