/** Microsoft-managed Date Filter Pro entitlement; independent of report data.
 * Licensing API documentation (checked 14 Oct 2026):
 * https://learn.microsoft.com/en-us/power-bi/developer/visuals/licensing-api
 * Numeric ServicePlanState values verified against Microsoft's visuals-api.d.ts:
 * Inactive=0, Active=1, Warning=2, Suspended=3, Unknown=4.
 * No report property, browser storage, URL flag, date value or email can grant access.
 */
export type DateLicenceState = 'unconfigured' | 'pending' | 'licensed' | 'unlicensed' | 'unavailable' | 'unsupported';
export interface LicenceTransport {
    getPlans(): PromiseLike<unknown>;
    notifyBlocked?(tooltip: string): PromiseLike<unknown>;
    clearNotification?(): PromiseLike<unknown>;
}
export function evaluateDateLicence(serviceId: string, raw: unknown): DateLicenceState {
    if (!serviceId.trim()) return 'unconfigured';
    if (!raw || typeof raw !== 'object') return 'unavailable';
    const value = raw as Record<string, unknown>;
    if (value.isLicenseUnsupportedEnv === true) return 'unsupported';
    if (value.isLicenseUnsupportedEnv !== false || value.isLicenseInfoAvailable !== true) return 'unavailable';
    if (value.plans !== undefined && !Array.isArray(value.plans)) return 'unavailable';
    const plans = (value.plans || []) as unknown[];
    const usable = plans.some(plan => {
        if (!plan || typeof plan !== 'object') return false;
        const p = plan as Record<string, unknown>;
        return p.spIdentifier === serviceId && (p.state === 1 || p.state === 2);
    });
    return usable ? 'licensed' : 'unlicensed';
}
/** One lookup per visual instance, as recommended by Microsoft. Host data is
 * cached for the Power BI session; this class does not promise live revocation
 * or poll that cache on each keystroke. Reopen/refresh the report after assignment.
 * A timeout cannot unlock dates. A late response cannot override a timeout/dispose.
 */
export class DateLicence {
    public state: DateLicenceState;
    private started = false;
    private disposed = false;
    private flight?: Promise<void>;
    private finish?: () => void;
    private lastNotificationAt = -Infinity;
    private notificationShown = false;
    constructor(
        private readonly serviceId: string,
        private readonly transport: LicenceTransport | undefined,
        private readonly changed: () => void,
        private readonly timeoutMs = 15_000,
        private readonly now: () => number = () => Date.now(),
    ) {
        this.state = serviceId.trim() ? 'pending' : 'unconfigured';
    }
    private emitChange(): void {
        // A renderer failure must not strand the licence promise or grant access.
        try { this.changed(); } catch { /* The consumer owns its render-error reporting. */ }
    }
    get allowed(): boolean { return !this.disposed && this.state === 'licensed'; }
    start(): Promise<void> {
        if (this.flight) return this.flight;
        if (this.started || this.disposed) return Promise.resolve();
        this.started = true;
        if (this.state === 'unconfigured') return Promise.resolve();
        if (!this.transport) { this.state = 'unsupported'; this.emitChange(); return Promise.resolve(); }
        this.flight = new Promise<void>(resolve => {
            let settled = false;
            let timer: ReturnType<typeof setTimeout> | undefined;
            const settle = (state?: DateLicenceState) => {
                if (settled) return;
                settled = true;
                if (timer !== undefined) clearTimeout(timer);
                this.finish = undefined;
                if (!this.disposed && state) { this.state = state; this.emitChange(); }
                resolve();
            };
            this.finish = () => settle();
            timer = setTimeout(() => settle('unavailable'), this.timeoutMs);
            try {
                const pending = this.transport!.getPlans();
                if (!pending || typeof pending.then !== 'function') { settle('unavailable'); return; }
                Promise.resolve(pending).then(raw => {
                    try { settle(evaluateDateLicence(this.serviceId, raw)); }
                    catch { settle('unavailable'); }
                }, () => settle('unavailable'));
            } catch { settle('unavailable'); }
        });
        return this.flight;
    }
    /** Use the native feature banner only after a paid action was requested.
     * Never put a whole-visual paywall over free searching or Clear/Reset.
     * Unavailable/unsupported/unconfigured is not reported as "not purchased".
     */
    async notifyBlocked(tooltip: string): Promise<boolean> {
        if (this.disposed || this.state !== 'unlicensed' || !this.transport?.notifyBlocked) return false;
        const now = this.now();
        if (now - this.lastNotificationAt < 10_000) return false;
        this.lastNotificationAt = now;
        try {
            const displayed = await this.transport.notifyBlocked(tooltip.slice(0, 500));
            if (this.disposed) return false;
            this.notificationShown = displayed === true;
            return this.notificationShown;
        } catch { return false; }
    }
    async clearNotification(): Promise<void> {
        if (this.disposed || !this.notificationShown || !this.transport?.clearNotification) return;
        try { await this.transport.clearNotification(); if (!this.disposed) this.notificationShown = false; }
        catch { /* Host notifications must never prevent free searching/clearing. */ }
    }
    dispose(): void { this.disposed = true; this.finish?.(); }
}
