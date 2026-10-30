import { Candidate, SearchField, Snapshot, SearchError, LIMITS } from "../core/types";
import { ColumnMetadata } from "./fieldResolver";
import { readBindings } from "./bindings";
import { validKey } from "../core/matcher";
import { hostDay } from "../core/dates";
import { numericSearchText } from "../core/numericText";
export interface InputTable { columns: readonly ColumnMetadata[]; rows: readonly (readonly unknown[])[]; }
/** Host uses fetchMoreData(true): each table is already an aggregated segment.
 * Never append these tables again; that would double-count previous segments.
 */
export function readSnapshot(table: InputTable, segmented: boolean): Snapshot {
    if (!table || !Array.isArray(table.columns) || !Array.isArray(table.rows)) throw new SearchError("table-shape", "Power BI did not provide a valid table view.");
    const binding = readBindings(table.columns);
    if (binding.keyError || !binding.keyTarget) throw binding.keyError || new SearchError("key-role", "Add one unique Record key.");
    const keyIndex=binding.keyIndex,keyTarget=binding.keyTarget;
    const indices=binding.search.map(f=>f.index), dateIndices=binding.dates.map(f=>f.index);
    const fields=binding.search.map(f=>f.field),dateFields=binding.dates.map(f=>f.field);
    // 0.5.4: column problems (hierarchy, wrong type, other table, duplicates,
    // too many fields) are notices; those columns are skipped or rerouted by
    // readBindings. Only a bad key or values that contradict their column type
    // still block the search. It fails only when no usable column remains.
    if(!fields.length&&!dateFields.length){
        const issue=binding.issues[0];
        throw new SearchError(issue?.code||"fields",issue?.message||"Add at least one Text/Number search column or a plain Date column.");
    }
    if (table.rows.length > LIMITS.rows) throw new SearchError("row-limit", `The prototype permits at most ${LIMITS.rows.toLocaleString()} candidate rows.`);
    let characters = 0;
    let keyType: string | undefined;
    const rows: Candidate[] = table.rows.map(row => {
        if (!Array.isArray(row) || row.length !== table.columns.length) throw new SearchError("row-width", "The incoming table row does not align with its columns.");
        const key = row[keyIndex];
        if (!validKey(key)) throw new SearchError("key-value", "Record key must contain nonblank text or finite numbers.");
        if (keyType && keyType !== typeof key) throw new SearchError("key-type", "Record key must use one consistent data type.");
        if (typeof key === "number" && Number.isInteger(key) && !Number.isSafeInteger(key)) {
            throw new SearchError("key-precision", "A numeric Record key exceeds safe integer precision. Store long identifiers as Text.");
        }
        keyType = typeof key;
        characters += String(key).length;
        const values = indices.map(i => {
            const value = row[i];
            if (value === null || value === undefined) return null;
            const col = table.columns[i];
            let text: string;
            if (col.type?.text && typeof value === "string") text = value;
            else if ((col.type?.numeric || col.type?.integer) && typeof value === "number") text = numericSearchText(value);
            else throw new SearchError("search-value", `“${col.displayName}” contains a value inconsistent with its Text or Number type.`);
            characters += text.length;
            return text;
        });
        const dates=dateIndices.map(i=>{const day=hostDay(row[i]);characters+=day?.length||0;return day;});
        if (characters > LIMITS.textCharacters) throw new SearchError("text-limit", "Too much text for this prototype. Reduce the candidate table.");
        return { key, values, ...(dateFields.length?{dates}:{}) };
    });
    return { fields, ...(dateFields.length?{dateFields}:{}), keyTarget, rows, complete: !segmented };
}
