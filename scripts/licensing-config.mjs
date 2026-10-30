import fs from 'node:fs';
import path from 'node:path';
export function validateLicensingConfig(config, {allowUnconfigured=false}={}) {
    if (!config || config.schemaVersion !== 1) throw Error('Unknown licensing configuration schema.');
    const id = config.servicePlanId;
    if (typeof id !== 'string') throw Error('servicePlanId must be a string.');
    if (!id) {
        if (allowUnconfigured) return;
        throw Error('Service ID is missing. Configure the generated Partner Center Service ID before making an AppSource build.');
    }
    if (id !== id.trim() || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(id)) throw Error('Invalid Service ID: paste the exact generated identifier without spaces.');
    if (id === config.planId || id === config.offerId) throw Error('Use Service ID (spIdentifier), not the friendly Plan ID or Offer ID.');
    if (/^(?:test|example|placeholder|replace|your[_:-])/i.test(id)) throw Error('Test/placeholder identifiers are not accepted for a release.');
}
export function readLicensingConfig(root, options) {
    const config=JSON.parse(fs.readFileSync(path.join(root,'config/licensing.json'),'utf8'));
    validateLicensingConfig(config, options);
    const source=fs.readFileSync(path.join(root,'src/licensing/config.ts'),'utf8');
    const match=source.match(/export const DATE_PRO_SERVICE_ID: string = ("(?:[^"\\]|\\.)*");/);
    if (!match || JSON.parse(match[1]) !== config.servicePlanId) throw Error('Licensing source/config mismatch. Run the configure-licensing script.');
    return config;
}
export function licenceConfigSource(id) {
    return '// Generated from config/licensing.json. Only the real Microsoft Service ID belongs here.\n'
        + '// Empty configuration never grants paid access. There is no runtime bypass.\n'
        + 'export const DATE_PRO_SERVICE_ID: string = '+JSON.stringify(id)+';\n';
}
