/** Resolve column metadata independently of rows. A wrongly placed column must
 * never erase neighbouring fields or block the search on them (0.5.4: in
 * Mohamed's report the text column HFB in "Date fields" stopped every search).
 * Only a missing/invalid Record key blocks searching; every column problem is a
 * non-blocking notice and that column is skipped or rerouted. */
import { ColumnTarget, SearchError, SearchField, LIMITS } from '../core/types';
import { ColumnMetadata, resolveTarget, fieldId } from './fieldResolver';
export interface BindingIssue { field: string; role: string; code: string; message: string; }
export interface IndexedField { index: number; field: SearchField; }
export interface Bindings {
    keyIndex: number; keyTarget?: ColumnTarget; keyError?: SearchError;
    search: IndexedField[]; dates: IndexedField[]; issues: BindingIssue[];
}
/** Do not classify an ordinary column called Year as a hierarchy. Only use
 * semantic structure or the host's unambiguous generated-table signatures. */
export function isHierarchyColumn(column: ColumnMetadata): boolean {
    const expr = column.expr as {level?: unknown; hierarchy?: unknown; arg?: unknown} | undefined;
    if (typeof expr?.level === 'string' || expr?.hierarchy !== undefined) return true;
    const source = (column.expr as {source?: {entity?: string}} | undefined)?.source?.entity || '';
    return /^(LocalDateTable_|DateTableTemplate_)/i.test(source) ||
        /(?:^|\.)LocalDateTable_[\w-]+\./i.test(column.queryName || '') ||
        /\.Date Hierarchy\./i.test(column.queryName || '');
}
function searchable(col: ColumnMetadata): boolean {
    return !col.isMeasure && !col.type?.bool && !!(col.type?.text || col.type?.numeric || col.type?.integer);
}
export function readBindings(input: readonly ColumnMetadata[] | undefined): Bindings {
    const columns = Array.isArray(input) ? input : [];
    const out: Bindings = {keyIndex: -1, search: [], dates: [], issues: []};
    const keyIndices = columns.map((c, i) => c?.roles?.recordKey ? i : -1).filter(i=>i>=0);
    if(keyIndices.length!==1) out.keyError=new SearchError('key-role','Add one unique Text or Number column to Record key.');
    else {
        out.keyIndex=keyIndices[0]; const meta=columns[out.keyIndex];
        try {
            if(isHierarchyColumn(meta)||meta.type?.dateTime||meta.type?.bool) throw new SearchError('key-role','Record key must be a plain Text or Number column, not a date or hierarchy.');
            out.keyTarget=resolveTarget(meta);
        } catch(error) {out.keyError=error instanceof SearchError?error:new SearchError('key-target','Cannot resolve the Record key.');}
    }
    const seenSearch=new Set<string>(),seenDate=new Set<string>();
    const issue=(col: ColumnMetadata, role: string, code: string, message: string)=>out.issues.push({field:col.displayName,role,code,message});
    for(let index=0;index<columns.length;index++) {
        const col=columns[index]; if(!col?.roles?.fields&&!col?.roles?.dates) continue;
        const role=col.roles.dates&&!col.roles.fields?'Date fields':'Search fields';
        try {
            if(isHierarchyColumn(col)) throw new SearchError('date-hierarchy',`“${col.displayName}” is a date hierarchy level and is ignored. Use the plain date column instead.`);
            const target=resolveTarget(col);
            if(out.keyTarget&&target.table!==out.keyTarget.table) throw new SearchError('same-table',`“${col.displayName}” is from another table than Record key and is ignored.`);
            const field={...target,id:fieldId(target),displayName:col.displayName};
            // A plain Date in either well is a date filter, NEVER searched as
            // separate Year/Quarter/Month/Day cells or coerced into a text ID.
            if(col.type?.dateTime) {
                if(seenDate.has(field.id)) throw new SearchError('duplicate-date-field',`“${col.displayName}” is assigned twice; it is used once.`);
                seenDate.add(field.id);out.dates.push({index,field});
                continue;
            }
            if(!searchable(col)) throw new SearchError(col.isMeasure?'measure':'search-type',`“${col.displayName}” is not a Text or Number column and is ignored.`);
            // 0.5.4: Text/Number in "Date fields" is searched as text instead of
            // blocking the visual. Power BI gives one column with both roles once.
            if(col.roles.dates) issue(col,'Date fields','date-type',`“${col.displayName}” is not a date, so it is searched as text and not offered as a date.`);
            if(seenSearch.has(field.id)) {
                // A second projection of the same column: search it once.
                if(!col.roles.dates) issue(col,role,'duplicate-field',`“${col.displayName}” is assigned twice; it is searched once.`);
                continue;
            }
            seenSearch.add(field.id);out.search.push({index,field});
        } catch(error) {
            const err=error instanceof SearchError?error:new SearchError('column-target',`“${col.displayName}” cannot be resolved to a plain column and is ignored.`);
            issue(col,role,err.code,err.message);
        }
    }
    if(out.search.length>LIMITS.fields){
        for(const extra of out.search.splice(LIMITS.fields)) out.issues.push({field:extra.field.displayName,role:'Search fields',code:'fields',message:`Only the first ${LIMITS.fields} search fields are used; “${extra.field.displayName}” is ignored.`});
    }
    if(out.dates.length>LIMITS.dateFields){
        for(const extra of out.dates.splice(LIMITS.dateFields)) out.issues.push({field:extra.field.displayName,role:'Date fields',code:'fields',message:`Only the first ${LIMITS.dateFields} date columns are used; “${extra.field.displayName}” is ignored.`});
    }
    return out;
}
/** Non-blocking notices about the field wells, one per line. */
export function bindingMessage(bindings: Bindings): string {
    return bindings.issues.length ? bindings.issues.map(i=>i.message).join('\n') : '';
}
export function bindingNotices(bindings: Bindings): string[] { return bindings.issues.map(i=>i.message); }
