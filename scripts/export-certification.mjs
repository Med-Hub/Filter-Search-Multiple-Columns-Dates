/** Create a draft reviewer-source tree, NOT a submission-ready certification claim.
 * Does not copy dependency binaries, offline vendor factories or old previews.
 */
import {cp,mkdir,readdir,readFile,writeFile,access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
if(!process.argv[2])throw Error('Pass a NEW destination directory.');
const out=path.resolve(process.argv[2]);
if(out===path.resolve(root)||out.startsWith(path.resolve(root)+path.sep))throw Error('Export outside the working source tree.');
try{await access(out);throw Error('Destination already exists; refusing to overwrite.');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(out,{recursive:true});
const rootFiles=['.gitignore','.nvmrc','BUILD-MAC.command','BUILD-WINDOWS.cmd','build.sh','README.md','LICENCE','THIRD_PARTY_NOTICES.md','package.json','package-lock.json','pbiviz.json','capabilities.json','tsconfig.json','tsconfig.core.json','eslint.config.mjs','upstream.lock.json'];
for(const p of rootFiles)await cp(path.join(root,p),path.join(out,p));
for(const p of ['src','tests','config','assets','sample'])await cp(path.join(root,p),path.join(out,p),{recursive:true});
const scripts=['test-core.mjs','configure.mjs','check-metadata.mjs','build-contract.mjs','build-local.mjs','doctor.mjs','check-syntax.mjs','licensing-config.mjs','check-licensing.mjs','configure-licensing.mjs','cert-security.cjs','upgrade-api.mjs','check-certification.mjs','package-sdk.mjs','export-certification.mjs','make-search-date-harness.py','test-ui.py','test-licensing-browser.py','test-render-lifecycle.py','certification-contract.mjs','collect-certification.mjs','test-release-smoke.py','check-installed-toolchain.mjs','artifact-contract.mjs','verify-source.mjs'];
await mkdir(path.join(out,'scripts'));for(const p of scripts)await cp(path.join(root,'scripts',p),path.join(out,'scripts',p));
await mkdir(path.join(out,'docs'));for(const p of ['UPSTREAM.md','HARDENING_0.6.1.md','CERTIFICATION_NEXT_STEPS.md','LICENSING_0.6.0.md','DEPENDENCY_INVENTORY.json','BUILD_KIT_README.md','SDK_DEPENDENCY_ESCALATION.md','HOST_ACCEPTANCE_CHECKLIST.md','TOOLCHAIN_0.6.2.md','GITHUB_SETUP.md'])await cp(path.join(root,'docs',p),path.join(out,'docs',p));
await cp(path.join(root,'.github'),path.join(out,'.github'),{recursive:true});
await mkdir(path.join(out,'upstream'));await cp(path.join(root,'upstream/MICROSOFT_NOTICE.txt'),path.join(out,'upstream/MICROSOFT_NOTICE.txt'));
const pkg=JSON.parse(await readFile(path.join(out,'package.json'),'utf8'));
for(const k of ['package:offline','package:offline:test','upstream:fetch'])delete pkg.scripts[k];
pkg.scripts['export:certification']='node scripts/export-certification.mjs';
await writeFile(path.join(out,'package.json'),JSON.stringify(pkg,null,2)+'\n');
const hashes={};async function walk(dir){for(const ent of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory())await walk(p);else hashes[path.relative(out,p).replaceAll(path.sep,'/')]=createHash('sha256').update(await readFile(p)).digest('hex');}}
await writeFile(path.join(out,'CERTIFICATION_STATUS.md'),'# NOT READY FOR SUBMISSION\n\nVersion 0.6.2 is a SOURCE candidate. API 5.11.1 and a scoped UUID 11.1.1 dependency are resolved in the npm-generated lockfile; installation and SDK compatibility remain unverified. The braces advisory, full audit/lint/build, real Service ID, real-host tests, sample PBIX and review-branch freeze remain unresolved. No new compiled visual is included. See docs/TOOLCHAIN_0.6.2.md.\n');
await walk(out);await writeFile(path.join(out,'SOURCE_SHA256.json'),JSON.stringify(hashes,null,2)+'\n');
console.log(out+' — clean draft source exported; no remote repository changed.');
