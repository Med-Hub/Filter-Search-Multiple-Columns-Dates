/** Offline preflight is an additional check, never a substitute for the full npm audit. */
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {inspectCertificationInputs} from './certification-contract.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const get=async p=>JSON.parse(await readFile(path.join(root,p),'utf8'));
const [pkg,visual,lock,targets]=await Promise.all(['package.json','pbiviz.json','package-lock.json','config/toolchain-targets.json'].map(get));
const report=inspectCertificationInputs(pkg,visual,lock,targets);
console.log(JSON.stringify(report,null,2));
if(!report.readyForReleasePipeline)process.exitCode=1;
