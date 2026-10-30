import { ColumnTarget } from "../core/types";
function unpack(value: unknown): unknown { if(Array.isArray(value)) return value.length===0 ? null : value.length===1 ? unpack(value[0]) : {unsupportedOwnedFilters:true}; return value; }
export interface OwnedFilterObservation { known: boolean; filter?: unknown; }
/** A JSON IFilter (or list/null) as produced by applyJsonFilter. */
function jsonShaped(value: unknown): boolean {
    if (value === null) return true;
    if (Array.isArray(value)) return value.every(jsonShaped);
    const target = (value as { target?: { table?: unknown; column?: unknown } } | undefined)?.target;
    return !!value && typeof value === "object" && typeof target?.table === "string" && typeof target?.column === "string";
}
/** Read this visual's own filter echo.
 *
 * 0.5.3: the documented source is `options.jsonFilters` (filter API, "Restore
 * the JSON filter from the data view"); DataBrothers and Microsoft's Text
 * Filter, Timeline and Chiclet slicers read only that. Power BI types
 * `dataView.metadata.objects.general.filter` as an opaque SemanticFilter, not a
 * JSON filter. 0.5.2 treated that property as authoritative, so in the real
 * host every echo of its own search looked like a foreign "replaced" filter:
 * the search was marked stale, available dates disappeared and the next search
 * cleared the report before re-applying.
 *
 * Never interpret another slicer's filter as an owned filter removal. An
 * explicit empty jsonFilters array describes a clear; missing information is
 * unknown. general.filter is used only when jsonFilters is absent AND the
 * value is visibly a JSON filter (older hosts and test doubles).
 */
export function readOwnedFilter(objects: unknown, jsonFilters: readonly unknown[] | undefined, key: ColumnTarget): OwnedFilterObservation {
    if (Array.isArray(jsonFilters)) {
        if (!jsonFilters.length) return { known: true, filter: null };
        const owned = jsonFilters.filter(filter => {
            const target = (filter as { target?: ColumnTarget } | null)?.target;
            return target?.table === key.table && target?.column === key.column;
        });
        if (owned.length === 1) return { known: true, filter: unpack(owned[0]) };
        if (owned.length > 1) return { known: true, filter: { unsupportedOwnedFilters: true } };
        return { known: false };
    }
    const general = (objects as { general?: Record<string, unknown> } | undefined)?.general;
    if (general && Object.prototype.hasOwnProperty.call(general, "filter") && general.filter !== undefined && jsonShaped(general.filter)) return { known: true, filter: unpack(general.filter) };
    return { known: false };
}
