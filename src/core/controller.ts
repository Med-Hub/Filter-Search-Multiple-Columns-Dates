import { Query, SearchResult, Snapshot, WireFilter, SearchError } from "./types";
import { search, sameSnapshot } from "./matcher";
import { normaliseQuery } from "./query";
import { makeKeyFilter } from "./filter";
export interface FilterSink { apply(filter: WireFilter | null): void; }
/** Defensive Phase-2 session controller. No production bookmark persistence.
 * Host callbacks may be synchronous: candidate changes during a submission
 * are handled before committing the query, never searched as a complete universe.
 */
export class SearchController {
    private snapshot: Snapshot | null = null;
    private stale = false;
    private waitingAfterClear = false;
    private submitting = false;
    private clearing = false;
    private dataRevision = 0;
    public applied: Query | null = null;
    public uiRevision = 0;
    public message = "Add text or numeric Search fields and a unique Record key.";
    constructor(private readonly sink: FilterSink, private readonly authorize: (query: Query) => void = () => {}) {}
    public ingest(snapshot: Snapshot, freshData: boolean): void {
        if (freshData) this.dataRevision++;
        const same = sameSnapshot(this.snapshot, snapshot);
        if (!this.clearing && (this.applied || this.submitting) && !same) this.stale = true;
        // Discard the old context (including old RLS rows) unless the host only
        // re-sent identical records; keeping that object keeps the search cache.
        if (!same || !this.snapshot) this.snapshot = snapshot;
        if (freshData && this.waitingAfterClear) this.waitingAfterClear = false;
        this.refreshMessage();
    }
    private refreshMessage(): void {
        if (this.stale) this.message = "Data or filter context changed. Clear this search, then search again. The previous filter may still be active.";
        else if (this.waitingAfterClear) this.message = "Filter cleared. Waiting for fresh Power BI data.";
        else if (!this.snapshot?.complete) this.message = "Loading all candidate records. Search is not available yet.";
        else if (!this.applied) this.message = "Ready. Search across the enabled fields.";
    }
    public markSavedFilter(): void {
        this.snapshot = null; this.stale = true; this.applied = null; this.uiRevision++;
        this.message = "Power BI restored or changed this filter without its search text. Clear this search before applying a new query.";
    }
    public observeExternalClear(): void {
        this.applied = null; this.stale = false; this.snapshot = null;
        this.waitingAfterClear = true; this.uiRevision++;
        this.message = "Power BI cleared this filter. Waiting for fresh data.";
    }
    public invalidate(message: string): void {
        if (this.applied || this.submitting) this.stale = true;
        this.snapshot = null; this.message = message;
    }
    public get currentSnapshot(): Snapshot | null { return this.canSearch ? this.snapshot : null; }
    public get needsRefresh(): boolean { return this.stale; }
    public get waitingForData(): boolean { return this.waitingAfterClear; }
    public get hasFilter(): boolean { return !!this.applied || this.stale; }
    public get canSearch(): boolean { return !!this.snapshot?.complete && !this.stale && !this.waitingAfterClear && !this.submitting && !this.clearing; }
    public submit(input: Query): SearchResult | null {
        const query = normaliseQuery(input);
        if (!query.text && !query.date) { this.clear(); return null; }
        // Paid-feature authorization is checked before scanning and before emitting.
        // Clear (above) never requires a paid licence.
        this.authorize(query);
        if (!this.canSearch || !this.snapshot) throw new SearchError("not-ready", this.message);
        const result = search(this.snapshot, query);
        const filter = makeKeyFilter(this.snapshot.keyTarget, result);
        this.authorize(query);
        this.submitting = true;
        try { this.sink.apply(filter); }
        finally { this.submitting = false; }
        // A throwing sink never reaches this commit, even with a reentrant update.
        this.applied = result.query; this.uiRevision++;
        if (this.stale) this.refreshMessage();
        else this.message = `Filter submitted: “${result.query.text}” · ${result.keys.length.toLocaleString()} matching IDs. Verify the other report visuals.`;
        return result;
    }
    public clear(): void {
        if (this.clearing || this.submitting) throw new SearchError("busy", "A filter operation is in progress.");
        const needsFreshData = this.stale || !!this.applied || this.waitingAfterClear;
        const before = this.dataRevision;
        this.clearing = true;
        try { this.sink.apply(null); }
        catch (error) { if (this.dataRevision !== before) this.stale = true; throw error; }
        finally { this.clearing = false; }
        this.applied = null; this.stale = false; this.uiRevision++;
        this.waitingAfterClear = needsFreshData && this.dataRevision === before;
        if (this.waitingAfterClear) this.snapshot = null;
        this.message = this.waitingAfterClear ? "Filter cleared. Waiting for fresh Power BI data." : "Search cleared. Your other slicers are unchanged.";
    }
}
