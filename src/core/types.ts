/** FieldFind prototype contracts. No Power BI or DOM dependency. */
export type MatchMode = "contains" | "startsWith" | "exact";
export type MatchLogic = "any" | "all";
export type RecordKey = string | number;
export interface ColumnTarget { table: string; column: string; }
export interface SearchField extends ColumnTarget { id: string; displayName: string; }
export type DateCondition = "on" | "between" | "onOrBefore" | "onOrAfter" | "blank";
export interface DateFilter { fieldId: string; condition: DateCondition; from?: string; to?: string; }
export interface Candidate { key: RecordKey; values: readonly (string | null)[]; dates?: readonly (string | null)[]; }
export interface Snapshot {
    fields: readonly SearchField[];
    dateFields?: readonly SearchField[];
    keyTarget: ColumnTarget;
    rows: readonly Candidate[];
    complete: boolean;
}
export interface Query { text: string; fieldIds: readonly string[]; mode: MatchMode; logic: MatchLogic; ignoreAccents?: boolean; date?: DateFilter | null; }
export interface SearchResult { query: Query; keys: RecordKey[]; scanned: number; }
export interface WireFilter {
    $schema: string;
    filterType: number;
    target: ColumnTarget;
    operator?: "In";
    values?: RecordKey[];
    logicalOperator?: "And";
    conditions?: { operator: "IsBlank" | "IsNotBlank" }[];
}
/** Deliberately conservative experiment guards, NOT Microsoft's limits. */
export const LIMITS = Object.freeze({
    fields: 10, dateFields: 5, rows: 100_000, matches: 5_000,
    payloadBytes: 512_000, queryCharacters: 512, textCharacters: 8_000_000,
});
export class SearchError extends Error {
    constructor(public readonly code: string, message: string) { super(message); this.name = "SearchError"; }
}
