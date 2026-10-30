/** Instance-owned segmented-data request coordinator.
 * This is a defensive loading experiment, not a Power BI completion guarantee.
 * No data values, query text, DOM or SDK dependencies are stored here.
 */
export type LoadFailure = "refused" | "request-error" | "timeout" | "no-progress";
export interface LoadScheduler {
    set(callback: () => void, milliseconds: number): unknown;
    clear(handle: unknown): void;
}
const browserScheduler: LoadScheduler = {
    set: (callback, milliseconds) => setTimeout(callback, milliseconds),
    clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
};
export const LOAD_TIMEOUT_MS = 30_000; // Our retry threshold, NOT a Microsoft limit.
export const LOAD_FAILURE_MESSAGES: Record<LoadFailure, string> = {
    refused: "Power BI stopped loading candidate records. Retry loading or refresh the report. The previous filter is kept.",
    "request-error": "Could not request the remaining records. Retry loading or refresh the report. The previous filter is kept.",
    timeout: "No new data arrived from Power BI. Retry loading or refresh the report. Search is blocked until all records are loaded.",
    "no-progress": "Power BI returned a segment without additional records. Retry loading or refresh the report. No partial search was applied.",
};
export class DataLoader {
    private generation = 0;
    private deferred: unknown;
    private watchdog: unknown;
    private awaiting = false;
    private disposed = false;
    private rowCount: number | null = null;
    private complete = true;
    private failure: LoadFailure | null = null;
    constructor(
        private readonly request: () => boolean,
        private readonly onFailure: (reason: LoadFailure) => void,
        private readonly scheduler: LoadScheduler = browserScheduler,
        private readonly timeoutMs = LOAD_TIMEOUT_MS,
    ) {
        if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error("A positive load timeout is required.");
    }
    public get canRetry(): boolean { return !this.disposed && !this.complete && this.failure !== null && this.rowCount !== null; }
    public get isPending(): boolean { return this.awaiting || this.deferred !== undefined; }
    public get failedReason(): LoadFailure | null { return this.failure; }
    /** Call for actual data updates, NOT resize/style notifications.
     * newContext corresponds to the host's Create operation or changed bindings.
     * Aggregated Append updates must increase the number of candidate rows.
     */
    public receive(rowCount: number, complete: boolean, newContext = false): void {
        if (this.disposed) return;
        if (!Number.isSafeInteger(rowCount) || rowCount < 0) throw new Error("Invalid candidate row count.");
        const hadRequest = this.isPending || this.failure !== null;
        const previousRows = this.rowCount;
        this.cancelTimers();
        this.generation++;
        this.awaiting = false;
        this.rowCount = rowCount;
        this.complete = complete;
        this.failure = null;
        if (complete) return;
        if (!newContext && hadRequest && previousRows !== null && rowCount <= previousRows) {
            this.fail("no-progress");
            return;
        }
        this.schedule();
    }
    public retry(): boolean {
        if (!this.canRetry) return false;
        this.failure = null;
        this.generation++;
        this.schedule();
        return true;
    }
    /** Invalidate outstanding requests when bindings are removed/invalid or a guard is hit. */
    public reset(): void {
        this.generation++;
        this.cancelTimers();
        this.awaiting = false;
        this.rowCount = null;
        this.complete = true;
        this.failure = null;
    }
    public dispose(): void { this.reset(); this.disposed = true; }
    private schedule(): void {
        if (this.disposed || this.complete || this.isPending) return;
        const generation = this.generation;
        this.deferred = this.scheduler.set(() => {
            this.deferred = undefined;
            if (this.disposed || generation !== this.generation) return;
            this.awaiting = true;
            // Arm BEFORE invoking the host: a host callback can be synchronous.
            this.watchdog = this.scheduler.set(() => {
                this.watchdog = undefined;
                if (!this.disposed && generation === this.generation && this.awaiting) this.fail("timeout");
            }, this.timeoutMs);
            try {
                const accepted = this.request();
                if (generation === this.generation && !this.disposed && !accepted) this.fail("refused");
            } catch {
                if (generation === this.generation && !this.disposed) this.fail("request-error");
            }
        }, 0);
    }
    private fail(reason: LoadFailure): void {
        this.cancelTimers();
        this.generation++;
        this.awaiting = false;
        this.failure = reason;
        this.onFailure(reason);
    }
    private cancelTimers(): void {
        if (this.deferred !== undefined) this.scheduler.clear(this.deferred);
        if (this.watchdog !== undefined) this.scheduler.clear(this.watchdog);
        this.deferred = undefined;
        this.watchdog = undefined;
    }
}
