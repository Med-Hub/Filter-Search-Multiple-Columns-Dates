import { ColumnTarget, WireFilter, SearchError, SearchResult, LIMITS } from "./types";
/** Supported JSON filter wire format. Zero matches are represented by a
 * contradiction, never a magic nonexistent key or an empty filter removal.
 */
export function makeKeyFilter(target: ColumnTarget, result: SearchResult): WireFilter | null {
    if (!result.query.text && !result.query.date) return null;
    const filter: WireFilter = result.keys.length ? {
        $schema: "https://powerbi.com/product/schema#basic", filterType: 1,
        target, operator: "In", values: result.keys,
    } : {
        $schema: "https://powerbi.com/product/schema#advanced", filterType: 0,
        target, logicalOperator: "And", conditions: [{ operator: "IsBlank" }, { operator: "IsNotBlank" }],
    };
    const size = new TextEncoder().encode(JSON.stringify(filter)).byteLength;
    if (size > LIMITS.payloadBytes) throw new SearchError("payload-limit", "This filter is too large for the prototype. Narrow the query; the previous filter was kept.");
    return filter;
}
