import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readLicensingConfig} from './licensing-config.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
try {
    if (args.some(arg=>arg!=='--allow-unconfigured')) throw Error('Unknown licence-check argument.');
    const c=readLicensingConfig(root,{allowUnconfigured:args.includes('--allow-unconfigured')});
    console.log(c.servicePlanId ? 'Service ID configured. Real Microsoft end-to-end licence testing is still required.' : 'TEST ONLY: Service ID is empty. All paid date actions remain unavailable. Do not submit this test package to AppSource.');
} catch(error) { console.error('LICENSING BUILD STOPPED: '+error.message); process.exitCode=1; }
