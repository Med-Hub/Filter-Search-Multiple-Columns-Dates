import {createRequire} from 'node:module';
import {readdirSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript');}catch{const global=execFileSync(process.platform==='win32'?'npm.cmd':'npm',['root','-g'],{encoding:'utf8',shell:process.platform==='win32'}).trim();ts=require(path.join(global,'typescript'));}
let count=0,failed=0;
function scan(dir){for(const file of readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,file.name);if(file.isDirectory()){scan(full);continue;}if(!/\.tsx?$/.test(file.name)||file.name.endsWith('.d.ts'))continue;const out=ts.transpileModule(readFileSync(full,'utf8'),{fileName:full,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}});const errors=(out.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);count++;if(errors.length){failed++;console.error(path.relative(root,full),errors.map(e=>ts.flattenDiagnosticMessageText(e.messageText,'\n')).join('\n'));}}}
scan(path.join(root,'src'));
console.log(`${count} source modules syntax-checked, ${failed} failed. This is not SDK typechecking.`);
if(failed)process.exitCode=1;
