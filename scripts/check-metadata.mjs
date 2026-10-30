import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readProject,validateMetadata} from './build-contract.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
try {
    const {pkg,visual,icon}=await readProject(root);
    const errors=validateMetadata(pkg,visual,icon,{requireEmail:!process.argv.includes('--source-only')});
    if(errors.length){for(const error of errors)console.error(error);process.exitCode=1;}
    else console.log('Prototype source metadata checked. SDK and marketplace validation remain separate.');
} catch(error){console.error(error.message);process.exitCode=1;}
