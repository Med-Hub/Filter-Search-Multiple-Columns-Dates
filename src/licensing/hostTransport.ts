import type powerbi from 'powerbi-visuals-api';
import { LicenceTransport } from '../core/dateLicence';
type Host = powerbi.extensibility.visual.IVisualHost;
/** Adapt Power BI's IPromise to a native Promise, preserving the host receiver. */
export function licenceTransport(host: Host): LicenceTransport | undefined {
    const manager = host.licenseManager;
    if (!manager || typeof manager.getAvailableServicePlans !== 'function') return undefined;
    return {
        getPlans: () => new Promise((resolve, reject) => { manager.getAvailableServicePlans().then(resolve, reject); }),
        notifyBlocked: tooltip => new Promise((resolve, reject) => {
            if (typeof manager.notifyFeatureBlocked !== 'function') { resolve(false); return; }
            manager.notifyFeatureBlocked(tooltip).then(resolve, reject);
        }),
        clearNotification: () => new Promise((resolve, reject) => {
            if (typeof manager.clearLicenseNotification !== 'function') { resolve(false); return; }
            manager.clearLicenseNotification().then(resolve, reject);
        }),
    };
}
