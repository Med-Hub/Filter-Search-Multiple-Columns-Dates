/** One terminal event per host update; independent from the renderer.
 * The callback must be invoked after DOM commit, not after scheduling render.
 * No input data or exception stack is sent to the host as an error message.
 */
export interface RenderingEvents<T> {
    renderingStarted(options: T): void;
    renderingFinished(options: T): void;
    renderingFailed(options: T, reason?: string): void;
}
export interface RenderCompletion {
    readonly settled: boolean;
    finish(): void;
    fail(reason?: string): void;
}
export class RenderLifecycle<T> {
    private readonly pending = new Set<RenderCompletion>();
    constructor(private readonly events: RenderingEvents<T>, private readonly timeoutMs = 15000) {}
    begin(options: T): RenderCompletion {
        this.events.renderingStarted(options);
        let settled = false;
        let watchdog: ReturnType<typeof setTimeout> | undefined;
        const complete = (failed: boolean, reason?: string): void => {
            if (settled) return;
            settled = true;
            if (watchdog !== undefined) clearTimeout(watchdog);
            this.pending.delete(cycle);
            // A broken host callback must not result in a second terminal event
            // or an unhandled exception from React's commit callback.
            try {
                if (failed) this.events.renderingFailed(options, reason || "The visual could not complete rendering.");
                else this.events.renderingFinished(options);
            } catch { /* Host event delivery failed; do not retry or log report data. */ }
        };
        const cycle: RenderCompletion = {
            get settled() { return settled; },
            finish: () => complete(false),
            fail: (reason?: string) => complete(true, reason),
        };
        this.pending.add(cycle);
        watchdog = setTimeout(() => cycle.fail("Rendering did not complete before its deadline."), this.timeoutMs);
        return cycle;
    }
    destroy(): void {
        for (const cycle of [...this.pending]) cycle.fail("Visual was disposed before rendering completed.");
    }
    get pendingCount(): number { return this.pending.size; }
}
