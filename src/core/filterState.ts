import { WireFilter } from "./types";
/** Compare filter semantics, not object property order or display metadata.
 * This is defensive observation, NOT query/bookmark persistence.
 */
export function filterSignature(filter: unknown): string | null {
    if (Array.isArray(filter)) { if (!filter.length) return null; if(filter.length===1) return filterSignature(filter[0]); return "unsupported"; }
    if (filter === null) return null;
    if (!filter || typeof filter !== "object") return "unsupported";
    const f = filter as Record<string, unknown>;
    const t = f.target as { table?: unknown; column?: unknown } | undefined;
    if (typeof t?.table !== "string" || typeof t?.column !== "string") return "unsupported";
    const target = [t.table, t.column];
    if (f.operator === "In" && Array.isArray(f.values) && f.values.every(v => typeof v === "string" || (typeof v === "number" && Number.isFinite(v)))) {
        const values = [...new Set(f.values.map(v => JSON.stringify([typeof v, v])))].sort();
        return JSON.stringify([target, "In", values]);
    }
    if (f.logicalOperator === "And" && Array.isArray(f.conditions) && f.conditions.length === 2) {
        const operators = f.conditions.map(c => (c as { operator?: unknown })?.operator).sort();
        if (operators[0] === "IsBlank" && operators[1] === "IsNotBlank") return JSON.stringify([target, "none"]);
    }
    // Unsupported host filters must never be treated as the current search.
    return "unsupported";
}
export type FilterObservation = "unchanged" | "cleared" | "replaced";
export class HostFilterTracker {
    private expected: string | null = null;
    private observed: string | null | undefined;
    private pending = new Set<string | null>();
    private version = 0;
    private recent = new Map<string,number>();
    public expect(filter: WireFilter | null): () => void {
        const before = { expected: this.expected, pending: new Set(this.pending) };
        this.pending.add(this.expected);
        if(this.expected!==null && this.expected!=="unsupported")this.recent.set(this.expected,Date.now());
        for(const [key,at] of this.recent)if(Date.now()-at>5000)this.recent.delete(key);
        while(this.recent.size>16)this.recent.delete(this.recent.keys().next().value!);
        this.expected = filterSignature(filter);
        const version = ++this.version;
        // Bound defensive echo history. Dropped echoes fail closed on observation.
        if (this.pending.size > 16) this.pending.delete(this.pending.values().next().value as string | null);
        return () => { if (this.version === version) { this.expected = before.expected; this.pending = before.pending; } };
    }
    public staleEcho = false;
    public observe(filter: unknown): FilterObservation {
        this.staleEcho=false;
        const signature = filterSignature(filter);
        if (signature !== "unsupported" && signature === this.expected) {
            this.observed = signature; this.pending.clear(); return "unchanged";
        }
        if (signature !== "unsupported" && this.pending.has(signature)) { this.staleEcho=true; return "unchanged"; }
        if (signature !== "unsupported" && signature === this.observed) return "unchanged";
        if(signature!==null && signature!=="unsupported" && this.recent.has(signature) && Date.now()-this.recent.get(signature)!<5000) { this.staleEcho=true; return "unchanged"; }
        this.version++; this.pending.clear(); this.observed = signature;
        this.expected = signature;
        return signature === null ? "cleared" : "replaced";
    }
}
