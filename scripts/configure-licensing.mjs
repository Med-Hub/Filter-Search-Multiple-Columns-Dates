/** Local project configuration only. Does not access Partner Center or buy/sell licences. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateLicensingConfig,licenceConfigSource} from './licensing-config.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
try {
    const args=process.argv.slice(2);
    if(args.length!==1)throw Error('Usage: node scripts/configure-licensing.mjs REAL_PARTNER_CENTER_SERVICE_ID');
    const p=path.join(root,'config/licensing.json');
    const config={...JSON.parse(fs.readFileSync(p,'utf8')),servicePlanId:args[0]};
    validateLicensingConfig(config);
    fs.writeFileSync(p,JSON.stringify(config,null,2)+'\n');
    fs.writeFileSync(path.join(root,'src/licensing/config.ts'),licenceConfigSource(config.servicePlanId));
    console.log('Service ID configured locally. Rebuild and test using a private Marketplace plan before publishing.');
} catch(error){console.error(error.message);process.exitCode=1;}
