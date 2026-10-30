import { normaliseDateFilter } from "./dates";
import { Query, SearchError, LIMITS } from "./types";
/** Ignore combining accents when requested; leave punctuation and original data intact. */
export function fold(value: string, ignoreAccents = true): string {
    const normal = value.normalize(ignoreAccents ? "NFD" : "NFC");
    return (ignoreAccents ? normal.replace(/[\u0300-\u036f]/g, "") : normal).toLowerCase();
}
export function normaliseQuery(query: Query): Query {
    if (!query || typeof query.text !== "string") throw new SearchError("query", "Enter a text query.");
    const text = query.text.trim();
    if (text.length > LIMITS.queryCharacters) throw new SearchError("query-length", `Use at most ${LIMITS.queryCharacters} characters.`);
    if (!["contains", "startsWith", "exact"].includes(query.mode)) throw new SearchError("mode", "Unsupported match mode.");
    if (!["any", "all"].includes(query.logic)) throw new SearchError("logic", "Unsupported matching logic.");
    if (!Array.isArray(query.fieldIds) || query.fieldIds.some(id => typeof id !== "string" || !id)) throw new SearchError("scope", "Select valid search fields.");
    if (query.ignoreAccents !== undefined && typeof query.ignoreAccents !== "boolean") throw new SearchError("accent-option", "Use a valid accent matching setting.");
    const date = normaliseDateFilter(query.date);
    return { ...(date ? {date} : {}), ignoreAccents: query.ignoreAccents !== false, text, mode: query.mode, logic: query.logic, fieldIds: [...new Set(query.fieldIds)] };
}
export function sameQuery(a: Query | null, b: Query): boolean {
    if (!a) return !b.text.trim() && !b.date;
    return JSON.stringify(a.date || null) === JSON.stringify(b.date || null) && a.text === b.text.trim() && a.mode === b.mode && a.logic === b.logic && (a.ignoreAccents !== false) === (b.ignoreAccents !== false) &&
        a.fieldIds.length === b.fieldIds.length && a.fieldIds.every(id => b.fieldIds.includes(id));
}

export function hasQueryFilters(query: Query): boolean { return !!query.text.trim() || !!query.date; }
