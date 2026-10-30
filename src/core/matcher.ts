import { Candidate, Query, SearchError, Snapshot, SearchResult, LIMITS, RecordKey, SearchField } from "./types";
import { dateMatches, validDay } from "./dates";
import { fold, normaliseQuery } from "./query";
export function keyToken(key: RecordKey): string { return JSON.stringify([typeof key, key]); }
export function validKey(value: unknown): value is RecordKey {
    return (typeof value === "string" && value.trim().length > 0) ||
        (typeof value === "number" && Number.isFinite(value));
}
export function validateSnapshot(snapshot: Snapshot): void { inspectSnapshot(snapshot); }
/** Validates a snapshot and returns each row's key token plus the number of
 * distinct keys. */
function inspectSnapshot(snapshot: Snapshot): { tokens: string[]; unique: number } {
    if (!snapshot.complete) throw new SearchError("incomplete", "Still loading records. Search has not been applied.");
    if ((!snapshot.fields.length && !(snapshot.dateFields?.length)) || snapshot.fields.length > LIMITS.fields || (snapshot.dateFields?.length||0)>LIMITS.dateFields) throw new SearchError("fields", `Add between 1 and ${LIMITS.fields} searchable text fields.`);
    if (!snapshot.keyTarget.table || !snapshot.keyTarget.column) throw new SearchError("key-target", "Add a unique Record key field.");
    if (snapshot.rows.length > LIMITS.rows) throw new SearchError("row-limit", `The prototype is limited to ${LIMITS.rows.toLocaleString()} candidate rows. Search has not been applied.`);
    const ids = new Set<string>();
    for (const f of [...snapshot.fields,...(snapshot.dateFields||[])]) {
        if (!f.id || !f.column || f.table !== snapshot.keyTarget.table || ids.has(f.id)) throw new SearchError("schema", "Use distinct search fields and a record key from the same table.");
        ids.add(f.id);
    }
    const seen = new Map<string, Candidate>();
    const tokens: string[] = [];
    let chars = 0;
    for (const row of snapshot.rows) {
        if (!validKey(row.key)) throw new SearchError("key", "Record key contains a blank or unsupported value.");
        if (row.values.length !== snapshot.fields.length || (row.dates?.length||0)!==(snapshot.dateFields?.length||0)) throw new SearchError("row-width", "The search fields do not align with the records.");
        for (const value of row.values) {
            if (value !== null && typeof value !== "string") throw new SearchError("text", "Search fields must be Text. Convert identifiers to Text in the model first.");
            chars += value?.length ?? 0;
        }
        for (const day of row.dates || []) { if (day!==null && !validDay(day)) throw new SearchError("date-value","A date is invalid."); chars+=day?.length||0; }
        chars += String(row.key).length;
        if (chars > LIMITS.textCharacters) throw new SearchError("text-limit", "Too much text for this prototype. Reduce the candidate table.");
        const token = keyToken(row.key);
        const previous = seen.get(token);
        if (previous && (previous.values.some((value, i) => value !== row.values[i]) || (previous.dates||[]).some((day,i)=>day!==row.dates?.[i]))) throw new SearchError("duplicate-key", "A Record key maps to different records. Choose a unique record-level key.");
        seen.set(token, row);
        tokens.push(token);
    }
    return { tokens, unique: seen.size };
}
/** 0.5.4: work that does not depend on the query (validation, key tokens and
 * folded field values) is done once per snapshot instead of on every search,
 * because search as you type now runs a search after each pause in typing.
 * Snapshots are not edited once read from the host (readSnapshot builds a new
 * one for every update); the identity checks also catch rows being added,
 * replaced or completed in place. Failed validation is never cached. */
interface Prepared {
    rows: readonly Candidate[]; count: number; complete: boolean; fields: readonly SearchField[]; dateFields: readonly SearchField[] | undefined;
    keyTable: string; keyColumn: string; tokens: string[]; unique: number; folded: Map<string, readonly (string | null)[]>;
}
const prepared = new WeakMap<Snapshot, Prepared>();
function prepare(snapshot: Snapshot): Prepared {
    const p = prepared.get(snapshot);
    if (p && p.rows === snapshot.rows && p.count === snapshot.rows.length && p.complete === snapshot.complete && p.fields === snapshot.fields &&
        p.dateFields === snapshot.dateFields && p.keyTable === snapshot.keyTarget.table && p.keyColumn === snapshot.keyTarget.column) return p;
    const { tokens, unique } = inspectSnapshot(snapshot);
    const next: Prepared = { rows: snapshot.rows, count: snapshot.rows.length, complete: snapshot.complete, fields: snapshot.fields, dateFields: snapshot.dateFields,
        keyTable: snapshot.keyTarget.table, keyColumn: snapshot.keyTarget.column, tokens, unique, folded: new Map() };
    prepared.set(snapshot, next);
    return next;
}
/** Prepares a complete snapshot ahead of the first search (validation, key
 * tokens, accent-folded values of every field), so that first search is as
 * quick as the rest. Problems are left for search() to report. */
export function prepareSearch(snapshot: Snapshot | null): void {
    if (!snapshot?.complete) return;
    try { const p = prepare(snapshot); snapshot.fields.forEach((_, i) => foldedColumn(p, i, true)); } catch { /* reported by search() */ }
}
function foldedColumn(p: Prepared, index: number, ignoreAccents: boolean): readonly (string | null)[] {
    const id = `${index}|${ignoreAccents ? 1 : 0}`;
    let column = p.folded.get(id);
    if (!column) { column = p.rows.map(row => { const value = row.values[index]; return value === null ? null : fold(value, ignoreAccents); }); p.folded.set(id, column); }
    return column;
}
export function matches(value: string | null, needle: string, mode: Query["mode"], ignoreAccents = true): boolean {
    if (value === null) return false;
    const text = fold(value, ignoreAccents);
    if (mode === "exact") return text === needle;
    if (mode === "startsWith") return text.startsWith(needle);
    return text.includes(needle);
}
export function search(snapshot: Snapshot, input: Query): SearchResult {
    const query = normaliseQuery(input);
    if (!query.text && !query.date) return { query, keys: [], scanned: 0 }; // adapter must CLEAR, not send an empty In
    const p = prepare(snapshot);
    if (query.text && !query.fieldIds.length) throw new SearchError("scope", "Keep at least one search field enabled.");
    const indices = query.fieldIds.map(id => snapshot.fields.findIndex(f => f.id === id));
    if (indices.some(i => i < 0)) throw new SearchError("scope", "The searchable fields changed. Review the selected fields.");
    const dateIndex=query.date ? (snapshot.dateFields||[]).findIndex(f=>f.id===query.date!.fieldId) : -1;
    if(query.date && dateIndex<0)throw new SearchError("date-field","The date column changed. Review the Date tab.");
    const ignoreAccents = query.ignoreAccents !== false;
    const needle = fold(query.text, ignoreAccents);
    const columns = query.text ? indices.map(i => foldedColumn(p, i, ignoreAccents)) : [];
    const test = query.mode === "exact" ? (text: string) => text === needle : query.mode === "startsWith" ? (text: string) => text.startsWith(needle) : (text: string) => text.includes(needle);
    const hitAt = (column: readonly (string | null)[], r: number) => { const text = column[r]; return text !== null && test(text); };
    const keys: RecordKey[] = [];
    const seen = new Set<string>();
    for (let r = 0; r < p.rows.length; r++) {
        const row = p.rows[r];
        const textHit = !query.text || (query.logic === "all" ? columns.every(c => hitAt(c, r)) : columns.some(c => hitAt(c, r)));
        if (!textHit || (query.date && !dateMatches(row.dates?.[dateIndex]??null, query.date))) continue;
        const token = p.tokens[r];
        if (!seen.has(token)) {
            seen.add(token); keys.push(row.key);
            if (keys.length > LIMITS.matches) throw new SearchError("match-limit", `More than ${LIMITS.matches.toLocaleString()} matches. Make the query more specific; the previous filter was kept.`);
        }
    }
    return { query, keys, scanned: p.unique };
}
export function sameSnapshot(a: Snapshot | null, b: Snapshot): boolean {
    if (!a || a.complete !== b.complete || a.keyTarget.table !== b.keyTarget.table || a.keyTarget.column !== b.keyTarget.column || a.fields.length !== b.fields.length || a.rows.length !== b.rows.length) return false;
    if (a.fields.some((f, i) => f.id !== b.fields[i].id || f.table !== b.fields[i].table || f.column !== b.fields[i].column)) return false;
    if (JSON.stringify(a.dateFields||[])!==JSON.stringify(b.dateFields||[]))return false;
    const sameDays = (x: readonly (string | null)[] = [], y: readonly (string | null)[] = []) => x.length === y.length && x.every((day, i) => day === y[i]);
    return a.rows.every((row, i) => row.key === b.rows[i].key && row.values.length === b.rows[i].values.length && row.values.every((v, j) => v === b.rows[i].values[j]) && sameDays(row.dates, b.rows[i].dates));
}
