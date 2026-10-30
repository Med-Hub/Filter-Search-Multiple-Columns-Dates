import { ColumnTarget, SearchError } from "../core/types";
/** Prefer the semantic expression; never substitute the display label.
 * The queryName fallback accepts only an unambiguous single-dot name.
 */
export interface ColumnMetadata {
    queryName?: string; displayName: string; isMeasure?: boolean;
    roles?: Record<string, boolean>; type?: { text?: boolean; numeric?: boolean; integer?: boolean; dateTime?: boolean; bool?: boolean };
    expr?: unknown;
}
export function resolveTarget(column: ColumnMetadata): ColumnTarget {
    if (column.isMeasure) throw new SearchError("measure", "Measures cannot be used as search fields or Record key.");
    const expr = column.expr as { ref?: unknown; source?: { entity?: unknown } } | undefined;
    if (typeof expr?.ref === "string" && typeof expr.source?.entity === "string" && expr.ref && expr.source.entity) {
        return { table: expr.source.entity, column: expr.ref };
    }
    const name = column.queryName || "";
    if (/^[^.\[\]]+\.[^.\[\]]+$/.test(name)) {
        const i = name.indexOf("."); return { table: name.slice(0, i), column: name.slice(i + 1) };
    }
    throw new SearchError("column-target", `Cannot safely resolve “${column.displayName}”. Use plain columns, not hierarchies.`);
}
export function fieldId(target: ColumnTarget): string { return JSON.stringify([target.table, target.column]); }
