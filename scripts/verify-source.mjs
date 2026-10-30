/** Verify a clean export. The inventory excludes only itself and .git internals.
 * Run BEFORE installing/building; generated extra files deliberately fail.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(process.argv[2]||fileURLToPath(new URL('../',import.meta.url)));
const expected=JSON.parse(fs.readFileSync(path.join(root,'SOURCE_SHA256.json'),'utf8'));
const actual={};
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){
    if(dir===root&&item.name==='.git')continue;
    const p=path.join(dir,item.name),rel=path.relative(root,p).split(path.sep).join('/');
    if(item.isSymbolicLink())throw Error('Unexpected symlink in source export: '+rel);
    if(item.isDirectory())walk(p);else if(rel!=='SOURCE_SHA256.json')actual[rel]=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}}
walk(root);
const issues=[...new Set([...Object.keys(expected),...Object.keys(actual)])].filter(k=>expected[k]!==actual[k]);
if(issues.length){console.error('Source inventory mismatch:\n'+issues.join('\n'));process.exitCode=1;}
else console.log(`${Object.keys(actual).length} source files verified; inventory complete.`);
