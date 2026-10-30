/* 0.5.4 options row (design C, chosen by Mohamed): reader options live in a
 * second row under the search bar, or replace the search row in a short visual.
 * Every choice opens as a strip in the same row, never as a pop-up, because a
 * custom visual cannot draw outside its own frame and Power BI's dialog was
 * refused in his Desktop. No native select menus, no focus mode, no dialog. */
import * as React from 'react';
import { CompactOptions, SearchPreferences } from '../core/compactOptions';
import { DateCatalogue, displayDay, compactDateLabel, dateLabel, parseDayText, stepDay, nearestDay, todayDay, normaliseDateFilter } from '../core/dates';
import { DateCondition, DateFilter, MatchLogic, MatchMode, SearchField } from '../core/types';
import { AlertIcon, BackIcon, BoxIcon, CalendarIcon, CheckIcon, ChevronDownIcon, CrossIcon, EraserIcon, InfoIcon, MoreIcon, NextIcon, PrevIcon, ResetIcon } from './InputButtonIcons';

export type RowMode = 'summary' | 'match' | 'logic' | 'fields' | 'more' | 'date' | 'dateColumn' | 'dateCondition' | 'notice';
/** 'refresh': the data or filter changed outside FieldFind; `action` is what the button does. */
export interface RowStatus { kind: 'ok' | 'setup' | 'loading' | 'refresh' | 'error'; message: string; label?: string; action?: string; }
export interface OptionsRowProps {
    options: CompactOptions; defaults: CompactOptions;
    fields: readonly SearchField[]; selectedIds: readonly string[];
    dateFields: readonly SearchField[]; catalogues: readonly DateCatalogue[]; date: DateFilter | null;
    matchCount: number | null; status: RowStatus; notices: readonly string[];
    canRetry: boolean; disabled: boolean; hasFilters: boolean;
    /** One-row layout: the row replaces the search row and offers a way back. */
    inline: boolean;
    mode: RowMode; onMode: (mode: RowMode) => void; onBackToSearch?: () => void;
    onPrefs: (prefs: SearchPreferences) => void; onFields: (ids: string[]) => void;
    onDate: (filter: DateFilter | null) => boolean;
    onClearAll: () => void; onReset: () => void; onRetry: () => void;
}
interface Draft { fieldId: string; condition: DateCondition; fromText: string; toText: string; }
interface State { draft: Draft | null; touched: boolean; lastMode: RowMode; lastDateField: string; }

export const MODE_LABELS: Record<MatchMode, string> = { contains: 'Contains', startsWith: 'Starts with', exact: 'Exact' };
export const LOGIC_LABELS: Record<MatchLogic, string> = { any: 'Any field', all: 'Every field' };
export const CONDITION_LABELS: Record<DateCondition, string> = { on: 'On a date', between: 'Between', onOrBefore: 'On or before', onOrAfter: 'On or after', blank: 'No date' };
const DATE_MODES: RowMode[] = ['date', 'dateColumn', 'dateCondition'];

/** Horizontal row that scrolls (wheel or touch) with soft edges when content is wider than the visual. */
function Scroller(p: { children: React.ReactNode; className?: string; label?: string; role?: string }) {
    const ref = React.useRef<HTMLDivElement>(null);
    const [edges, setEdges] = React.useState({ l: false, r: false });
    const measure = React.useCallback(() => {
        const e = ref.current; if (!e) return;
        const l = e.scrollLeft > 1, r = e.scrollLeft + e.clientWidth < e.scrollWidth - 1;
        setEdges(s => s.l === l && s.r === r ? s : { l, r });
    }, []);
    React.useLayoutEffect(measure);
    React.useEffect(() => {
        const e = ref.current; if (!e || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(measure); observer.observe(e); return () => observer.disconnect();
    }, [measure]);
    return <div ref={ref} className={`ff-scroll ${edges.l ? 'ff-fade-l' : ''} ${edges.r ? 'ff-fade-r' : ''} ${p.className || ''}`} role={p.role} aria-label={p.label}
        onScroll={measure} onWheel={e => { const el = ref.current; if (el && el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) el.scrollLeft += e.deltaY; }}>{p.children}</div>;
}
function interleave(items: React.ReactNode[]): React.ReactNode[] {
    const out: React.ReactNode[] = [];
    items.filter(Boolean).forEach((item, i) => { if (i) out.push(<span key={'sep' + i} className="ff-sep" aria-hidden="true" />); out.push(item); });
    return out;
}

export class OptionsRow extends React.Component<OptionsRowProps, State> {
    private root = React.createRef<HTMLDivElement>();
    private returnTo = '';
    constructor(p: OptionsRowProps) { super(p); this.state = { draft: DATE_MODES.includes(p.mode) ? OptionsRow.initDraft(p, '') : null, touched: false, lastMode: p.mode, lastDateField: '' }; }
    /** The draft must exist in the same render that shows the date editor, so
     * the editor (not the summary) is what receives focus. */
    static getDerivedStateFromProps(p: OptionsRowProps, s: State): Partial<State> | null {
        if (p.mode === s.lastMode) return null;
        const entering = p.mode === 'date' && !DATE_MODES.includes(s.lastMode);
        return { lastMode: p.mode, ...(entering || (DATE_MODES.includes(p.mode) && !s.draft) ? { draft: OptionsRow.initDraft(p, s.lastDateField), touched: false } : {}) };
    }
    componentDidMount() {
        // One-row layout: the row has just replaced the search row (options or date button).
        if (this.props.inline || this.props.mode !== 'summary') this.focusAfterModeChange('summary');
    }
    componentDidUpdate(previous: OptionsRowProps) {
        if (previous.mode !== this.props.mode) this.focusAfterModeChange(previous.mode);
        // A date column removed from the visual while editing.
        const d = this.state.draft;
        if (d && DATE_MODES.includes(this.props.mode) && !this.props.dateFields.some(f => f.id === d.fieldId)) {
            if (this.props.dateFields.length) this.setState({ draft: { ...d, fieldId: this.props.dateFields[0].id } }); else this.props.onMode('summary');
        }
    }
    private focusAfterModeChange(previous: RowMode) {
        const root = this.root.current; if (!root) return;
        let target: HTMLElement | null = null;
        if (this.props.mode === 'summary' && this.returnTo) target = root.querySelector<HTMLElement>(`[data-ff-chip="${this.returnTo}"]`);
        if (this.props.mode === 'date' && (previous === 'dateColumn' || previous === 'dateCondition')) target = root.querySelector<HTMLElement>(`[data-ff-chip="${previous}"]`);
        if (!target) target = root.querySelector<HTMLElement>('[data-ff-autofocus]:not(:disabled)') || root.querySelector<HTMLElement>('button:not(:disabled),input:not(:disabled)');
        if (root.contains(document.activeElement) || document.activeElement === document.body || !document.activeElement) target?.focus({ preventScroll: true } as FocusOptions);
    }
    private open(mode: RowMode, from: string) { this.returnTo = from; this.props.onMode(mode); }
    private back = () => {
        const m = this.props.mode;
        if (m === 'dateColumn' || m === 'dateCondition') this.props.onMode('date');
        else if (m === 'summary') this.props.onBackToSearch?.();
        else this.props.onMode('summary');
    };
    private catalogue(fieldId: string) { return this.props.catalogues.find(c => c.fieldId === fieldId); }
    private static initDraft(p: OptionsRowProps, lastDateField: string): Draft {
        const active = p.date;
        if (active && p.dateFields.some(f => f.id === active.fieldId)) {
            const from = active.from ? displayDay(active.from, true) : '';
            return { fieldId: active.fieldId, condition: active.condition, fromText: from, toText: active.to ? displayDay(active.to, true) : from };
        }
        const fieldId = p.dateFields.some(f => f.id === lastDateField) ? lastDateField : p.dateFields[0]?.id || '';
        const days = p.catalogues.find(c => c.fieldId === fieldId)?.days || [];
        const near = nearestDay(days, todayDay());
        const text = near ? displayDay(near, true) : '';
        return { fieldId, condition: 'on', fromText: text, toText: text };
    }
    /** The filter the draft describes, or the reason it cannot be applied. */
    private evaluate(d: Draft): { filter?: DateFilter; error?: string } {
        if (!d.fieldId) return { error: 'Add a date column in Build visual.' };
        if (d.condition === 'blank') return { filter: { fieldId: d.fieldId, condition: 'blank' } };
        const from = parseDayText(d.fromText);
        if (!from) return { error: d.fromText.trim() ? `“${d.fromText.trim()}” is not a date. Type it like 8/10/2026.` : 'Choose a date.' };
        if (d.condition === 'on') {
            const c = this.catalogue(d.fieldId);
            if (!c?.complete) return { error: this.props.status.kind === 'refresh' ? 'Refresh the search first.' : 'Dates are still loading.' };
            if (!c.days.includes(from)) return { error: `No rows on ${displayDay(from, true)}.` };
        }
        let to: string | undefined;
        if (d.condition === 'between') {
            to = parseDayText(d.toText) || undefined;
            if (!to) return { error: d.toText.trim() ? `“${d.toText.trim()}” is not a date.` : 'Choose the end date.' };
            if (from > to) return { error: 'The first date must be on or before the second.' };
        }
        try { return { filter: normaliseDateFilter({ fieldId: d.fieldId, condition: d.condition, from, ...(to ? { to } : {}) })! }; }
        catch (e) { return { error: e instanceof Error ? e.message : 'Check the date.' }; }
    }
    private setDraft(update: Partial<Draft>, touched = false) { this.setState(s => ({ draft: s.draft ? { ...s.draft, ...update } : s.draft, touched })); }
    private step(which: 'fromText' | 'toText', direction: 1 | -1) {
        const d = this.state.draft; if (!d) return;
        const days = this.catalogue(d.fieldId)?.days || [];
        const current = parseDayText(d[which]) || nearestDay(days, todayDay()) || todayDay();
        const next = parseDayText(d[which]) ? stepDay(days, current, direction) : current;
        this.setDraft({ [which]: displayDay(next, true) } as Partial<Draft>, true);
    }
    private apply = () => {
        const d = this.state.draft; if (!d) return;
        const { filter } = this.evaluate(d);
        this.setState({ touched: true });
        if (!filter) return;
        this.returnTo = 'date';
        if (this.props.onDate(filter)) this.setState({ lastDateField: d.fieldId }, () => this.props.onMode('summary'));
    };
    private onKeyDown = (e: React.KeyboardEvent) => {
        // In the two-row summary Esc has nothing to close: leave it to Power BI
        // (keyboard users leave the visual with Esc).
        if (e.key !== 'Escape' || (this.props.mode === 'summary' && !this.props.onBackToSearch)) return;
        e.preventDefault(); e.stopPropagation(); this.back();
    };

    // ---------- summary ----------
    private fieldsLabel(): string {
        const { fields, selectedIds } = this.props, n = fields.filter(f => selectedIds.includes(f.id)).length;
        if (n === fields.length) return 'All fields';
        if (n === 1) return fields.find(f => selectedIds.includes(f.id))?.displayName || '1 field';
        return `${n} of ${fields.length} fields`;
    }
    private dateChip(): React.ReactNode {
        const { date, dateFields, disabled } = this.props;
        const field = date ? dateFields.find(f => f.id === date.fieldId) : undefined;
        if (!date || !field) return <button key="date" type="button" className="ff-chip" data-ff-chip="date" disabled={disabled} aria-label="Filter by date" onClick={() => this.open('date', 'date')}><CalendarIcon /><span>Date</span><ChevronDownIcon /></button>;
        return <span key="date" className="ff-chip-pair ff-chip-active">
            <button type="button" className="ff-chip" data-ff-chip="date" disabled={disabled} title={`${field.displayName}: ${dateLabel(date)}`} aria-label={`Edit date filter: ${field.displayName}, ${dateLabel(date)}`} onClick={() => this.open('date', 'date')}>
                <CalendarIcon /><span className="ff-chip-strong">{field.displayName}</span><span className="ff-dot" aria-hidden="true">·</span><span>{compactDateLabel(date)}</span></button>
            <button type="button" className="ff-chip-x" disabled={disabled} aria-label="Clear date filter" title="Clear date" onClick={() => { this.returnTo = 'date'; this.props.onDate(null); }}><CrossIcon /></button>
        </span>;
    }
    private status(): React.ReactNode {
        const { status, matchCount, notices, options } = this.props, out: React.ReactNode[] = [];
        if (status.kind === 'error') out.push(<button key="err" type="button" className="ff-status ff-status-error" title={status.message} aria-label={`Problem: ${status.message}`} onClick={() => this.open('notice', 'notice')}><AlertIcon /><span>{status.message.split('\n')[0]}</span></button>);
        else if (status.kind === 'refresh') out.push(<button key="refresh" type="button" className="ff-status ff-status-action" title={status.message} aria-label={`${status.action}: ${status.message}`} disabled={this.props.disabled} onClick={this.props.onRetry}><ResetIcon /><span>{status.label} · <b>{status.action}</b></span></button>);
        else if (status.kind === 'setup' || status.kind === 'loading') out.push(<span key="st" className="ff-status" role="status" title={status.message}>{status.kind === 'loading' ? 'Loading…' : status.message}</span>);
        else if (options.showCount && matchCount !== null) out.push(<span key="count" className={`ff-status ${matchCount === 0 ? 'ff-status-error' : ''}`} role="status">{matchCount === 0 ? 'No matches' : `${matchCount.toLocaleString()} ${matchCount === 1 ? 'match' : 'matches'}`}</span>);
        if (notices.length) out.push(<button key="info" type="button" className="ff-iconbtn ff-info" title={notices.join('\n')} aria-label={`${notices.length} note${notices.length > 1 ? 's' : ''} about the fields`} onClick={() => this.open('notice', 'notice')}><InfoIcon /></button>);
        return out.length ? <div className="ff-status-area">{out}</div> : null;
    }
    private summary(): React.ReactNode {
        const p = this.props, o = p.options, d = p.defaults, selected = p.fields.filter(f => p.selectedIds.includes(f.id)).length;
        const items = interleave([
            o.showMatch && <button key="match" type="button" className={`ff-chip ${o.mode !== d.mode ? 'ff-changed' : ''}`} data-ff-chip="match" disabled={p.disabled} aria-label={`Match type: ${MODE_LABELS[o.mode]}`} onClick={() => this.open('match', 'match')}><span>{MODE_LABELS[o.mode]}</span><ChevronDownIcon /></button>,
            o.showFields && p.fields.length > 1 && <button key="fields" type="button" className={`ff-chip ${selected !== p.fields.length ? 'ff-changed' : ''}`} data-ff-chip="fields" disabled={p.disabled} aria-label={`Search fields: ${this.fieldsLabel()}`} onClick={() => this.open('fields', 'fields')}><span>{this.fieldsLabel()}</span><ChevronDownIcon /></button>,
            o.showLogic && selected > 1 && <button key="logic" type="button" className={`ff-chip ${o.logic !== d.logic ? 'ff-changed' : ''}`} data-ff-chip="logic" disabled={p.disabled} aria-label={`Match in: ${LOGIC_LABELS[o.logic]}`} onClick={() => this.open('logic', 'logic')}><span>{LOGIC_LABELS[o.logic]}</span><ChevronDownIcon /></button>,
            o.showDate && p.dateFields.length > 0 && this.dateChip(),
        ]);
        return <>
            {p.inline && <button type="button" className="ff-iconbtn ff-back" aria-label="Back to search" title="Back to search" onClick={this.back}><BackIcon /></button>}
            <Scroller label="Search options" role="toolbar">{items}{o.showMore && <button type="button" className="ff-iconbtn ff-more" data-ff-chip="more" disabled={p.disabled} aria-label="More options" title="More options" onClick={() => this.open('more', 'more')}><MoreIcon /></button>}</Scroller>
            {this.status()}
        </>;
    }

    // ---------- strips ----------
    private strip(label: string, body: React.ReactNode, trailing?: React.ReactNode): React.ReactNode {
        return <>
            <button type="button" className="ff-iconbtn ff-back" aria-label="Back" title="Back (Esc)" onClick={this.back}><BackIcon /></button>
            {label && <span className="ff-strip-label">{label}</span>}
            <Scroller label={label || 'Options'} role="group">{body}</Scroller>
            {this.props.status.kind === 'error' && this.props.mode !== 'notice' && <button type="button" className="ff-status ff-status-error ff-strip-error" title={this.props.status.message} aria-label={`Problem: ${this.props.status.message}`} onClick={() => this.open('notice', 'notice')}><AlertIcon /><span>{this.props.status.message.split('\n')[0]}</span></button>}
            {trailing}
        </>;
    }
    private choice<T extends string>(value: T, current: T, label: string, onPick: (v: T) => void, autofocus: boolean): React.ReactNode {
        const on = value === current;
        return <button key={value} type="button" className="ff-choice" aria-pressed={on} disabled={this.props.disabled} data-ff-autofocus={autofocus || undefined} onClick={() => onPick(value)}>{on && <CheckIcon />}<span>{label}</span></button>;
    }
    private matchStrip() {
        const o = this.props.options;
        return this.strip('Match', (Object.keys(MODE_LABELS) as MatchMode[]).map(m => this.choice(m, o.mode, MODE_LABELS[m], v => { this.props.onPrefs({ mode: v }); this.props.onMode('summary'); }, m === o.mode)));
    }
    private logicStrip() {
        const o = this.props.options;
        return this.strip('Match in', (Object.keys(LOGIC_LABELS) as MatchLogic[]).map(m => this.choice(m, o.logic, m === 'any' ? 'Any selected field' : 'Every selected field', v => { this.props.onPrefs({ logic: v }); this.props.onMode('summary'); }, m === o.logic)));
    }
    private fieldsStrip() {
        const p = this.props, selected = new Set(p.selectedIds), all = p.fields.every(f => selected.has(f.id));
        const lone = p.fields.filter(x => selected.has(x.id)).length === 1, first = p.fields.findIndex(f => !(lone && selected.has(f.id)));
        return this.strip('Search in', <>
            {p.fields.map((f, i) => {
                const on = selected.has(f.id), last = on && p.fields.filter(x => selected.has(x.id)).length === 1;
                return <button key={f.id} type="button" className="ff-toggle" aria-pressed={on} disabled={p.disabled || last} title={last ? 'At least one field stays selected' : f.displayName} data-ff-autofocus={i === first || undefined}
                    onClick={() => p.onFields(on ? p.selectedIds.filter(id => id !== f.id) : p.fields.filter(x => selected.has(x.id) || x.id === f.id).map(x => x.id))}><BoxIcon checked={on} /><span>{f.displayName}</span></button>;
            })}
            {!all && <button type="button" className="ff-link" disabled={p.disabled} onClick={() => p.onFields(p.fields.map(f => f.id))}>Select all</button>}
        </>);
    }
    private switchButton(label: string, on: boolean, onChange: (v: boolean) => void, autofocus = false) {
        return <button type="button" role="switch" aria-checked={on} className="ff-switch" disabled={this.props.disabled} data-ff-autofocus={autofocus || undefined} onClick={() => onChange(!on)}><span className="ff-track" aria-hidden="true"><span className="ff-knob" /></span><span>{label}</span></button>;
    }
    private moreStrip() {
        const p = this.props, o = p.options, d = p.defaults;
        const changed = o.mode !== d.mode || o.logic !== d.logic || o.ignoreAccents !== d.ignoreAccents || o.autoSearch !== d.autoSearch || p.fields.some(f => !p.selectedIds.includes(f.id));
        return this.strip('', <>
            {this.switchButton('Ignore accents', o.ignoreAccents, v => p.onPrefs({ ignoreAccents: v }), true)}
            {this.switchButton('Search as you type', o.autoSearch, v => p.onPrefs({ autoSearch: v }))}
            {changed && <button type="button" className="ff-link" disabled={p.disabled} onClick={() => { p.onReset(); p.onMode('summary'); }}><ResetIcon /><span>Reset options</span></button>}
            {p.hasFilters && <button type="button" className="ff-link" disabled={p.disabled} onClick={() => { p.onClearAll(); p.onMode('summary'); }}><EraserIcon /><span>Clear all</span></button>}
        </>);
    }
    private noticeStrip() {
        const p = this.props, error = p.status.kind === 'error' ? p.status.message : '';
        const lines = [...(error ? [error] : []), ...p.notices];
        return this.strip('', <span className={`ff-notice ${error ? 'ff-notice-error' : ''}`} role="status">{error ? <AlertIcon /> : <InfoIcon />}<span>{lines.join('  ·  ') || 'No notes.'}</span></span>,
            p.canRetry ? <button type="button" className="ff-apply" disabled={p.disabled} onClick={p.onRetry}>Retry</button> : undefined);
    }
    private dateEditor() {
        const p = this.props, d = this.state.draft; if (!d) return null;
        const field = p.dateFields.find(f => f.id === d.fieldId), result = this.evaluate(d), showError = this.state.touched && !!result.error;
        const stepper = (which: 'fromText' | 'toText', label: string, autofocus: boolean) => <span className={`ff-step ${showError && which === 'fromText' && !parseDayText(d.fromText) || showError && which === 'toText' && !parseDayText(d.toText) ? 'ff-invalid' : ''}`}>
            <button type="button" className="ff-step-btn" tabIndex={-1} aria-label={`Previous ${label.toLowerCase()} with rows`} disabled={p.disabled} onClick={() => this.step(which, -1)}><PrevIcon /></button>
            <input type="text" className="ff-step-input" aria-label={label} value={d[which]} size={11} spellCheck={false} autoComplete="off" disabled={p.disabled} data-ff-autofocus={autofocus || undefined} placeholder="dd/mm/yyyy"
                aria-invalid={showError || undefined}
                onChange={e => this.setDraft({ [which]: e.target.value } as Partial<Draft>)} onBlur={() => this.setState({ touched: true })}
                onKeyDown={e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); this.step(which, e.key === 'ArrowDown' ? 1 : -1); } if (e.key === 'Enter') { e.preventDefault(); this.apply(); } }} />
            <button type="button" className="ff-step-btn" tabIndex={-1} aria-label={`Next ${label.toLowerCase()} with rows`} disabled={p.disabled} onClick={() => this.step(which, 1)}><NextIcon /></button>
        </span>;
        const body = <>
            {p.dateFields.length > 1
                ? <button type="button" className="ff-chip ff-chip-strong" data-ff-chip="dateColumn" disabled={p.disabled} aria-label={`Date column: ${field?.displayName}`} onClick={() => this.props.onMode('dateColumn')}><CalendarIcon /><span>{field?.displayName}</span><ChevronDownIcon /></button>
                : <span className="ff-strip-label ff-chip-strong"><CalendarIcon />{field?.displayName}</span>}
            <button type="button" className="ff-chip" data-ff-chip="dateCondition" disabled={p.disabled} aria-label={`Condition: ${CONDITION_LABELS[d.condition]}`} onClick={() => this.props.onMode('dateCondition')}><span>{CONDITION_LABELS[d.condition]}</span><ChevronDownIcon /></button>
            {d.condition !== 'blank' && stepper('fromText', d.condition === 'between' ? 'From' : 'Date', true)}
            {d.condition === 'between' && <span className="ff-dash" aria-hidden="true">–</span>}
            {d.condition === 'between' && stepper('toText', 'To', false)}
            {showError && <span className="ff-field-error" role="status">{result.error}</span>}
        </>;
        return this.strip('', body, <>
            <button type="button" className="ff-apply" disabled={p.disabled || !!result.error} title={result.error || 'Apply date filter'} onClick={this.apply}>Apply</button>
            {p.date && <button type="button" className="ff-link ff-remove" disabled={p.disabled} onClick={() => { if (p.onDate(null)) p.onMode('summary'); }}>Remove</button>}
        </>);
    }
    private dateColumnStrip() {
        const d = this.state.draft!; const p = this.props;
        return this.strip('Date column', p.dateFields.map(f => this.choice(f.id, d.fieldId, f.displayName, id => {
            const days = this.catalogue(id)?.days || [], from = parseDayText(d.fromText), to = parseDayText(d.toText);
            const near = (x: string | null) => { const n = nearestDay(days, x || todayDay()); return n ? displayDay(n, true) : ''; };
            this.setState({ draft: { ...d, fieldId: id, fromText: d.condition === 'on' && from && !days.includes(from) ? near(from) : d.fromText || near(null), toText: d.toText || (to ? d.toText : near(null)) }, touched: false });
            p.onMode('date');
        }, f.id === d.fieldId)));
    }
    private dateConditionStrip() {
        const d = this.state.draft!; const p = this.props;
        return this.strip('Condition', (Object.keys(CONDITION_LABELS) as DateCondition[]).map(c => this.choice(c, d.condition, CONDITION_LABELS[c], v => {
            const days = this.catalogue(d.fieldId)?.days || [], from = parseDayText(d.fromText);
            const fromText = v === 'on' && from && days.length && !days.includes(from) ? displayDay(nearestDay(days, from)!, true) : d.fromText;
            this.setState({ draft: { ...d, condition: v, fromText, toText: v === 'between' && !parseDayText(d.toText) ? fromText : d.toText }, touched: false });
            p.onMode('date');
        }, c === d.condition)));
    }
    render() {
        const m = this.props.mode;
        const content = m === 'match' ? this.matchStrip() : m === 'logic' ? this.logicStrip() : m === 'fields' ? this.fieldsStrip() : m === 'more' ? this.moreStrip()
            : m === 'notice' ? this.noticeStrip() : m === 'date' && this.state.draft ? this.dateEditor() : m === 'dateColumn' && this.state.draft ? this.dateColumnStrip()
            : m === 'dateCondition' && this.state.draft ? this.dateConditionStrip() : this.summary();
        return <div ref={this.root} className={`ff-row ff-row-options ff-mode-${m}`} data-ff-mode={m} onKeyDown={this.onKeyDown}>{content}</div>;
    }
}
