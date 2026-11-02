/* DataBrothers React/input foundation (MIT). Draft state belongs to the input.
 * Host filter echoes must NEVER overwrite the draft or cancel newer keystrokes.
 * 0.5.4 layout (design C): row 1 = search; row 2 = reader options, shown when
 * the visual is tall enough. In a short visual the options button turns row 1
 * into the options row instead. Everything stays inside the visual's frame. */
import * as React from 'react';
import { CrossIcon, EraserIcon, SearchIcon, SlidersIcon, CalendarIcon, AlertIcon, ResetIcon } from './InputButtonIcons';
import { Query, SearchField, DateFilter } from '../core/types';
import { CompactOptions, SettingsResult, SearchPreferences, withSearchPreferences } from '../core/compactOptions';
import { DateCatalogue, dateLabel, compactDateLabel } from '../core/dates';
import { ThemeColours, lookTokens, twoRowHeight } from '../core/theme';
import { reconcileScope } from '../core/scope';
import { sameQuery } from '../core/query';
import { OptionsRow, RowMode, RowStatus } from './OptionsRow';
import '../style/TextSearchSlicer.css';

export interface ITextSearchSlicerProps {
    fields: readonly SearchField[]; dateFields: readonly SearchField[]; catalogues: readonly DateCatalogue[];
    options: CompactOptions; defaults: CompactOptions; theme: ThemeColours; width: number; height: number;
    status: RowStatus; notices: readonly string[]; matchCount: number | null;
    canSearch: boolean; applied: Query | null; hasActiveFilter: boolean;
    canRetryLoading: boolean; interactionsAllowed: boolean;
    onDateAccess: () => boolean;
    onApply: (query: Query) => boolean; onClear: () => boolean; onSaveSettings: (result: SettingsResult) => boolean; onRetry: (query: Query) => void;
}
interface State { text: string; selectedIds: string[]; date: DateFilter | null; options: CompactOptions; view: 'search' | 'options'; rowMode: RowMode; localError: string; }
/** Release marker read by the packaged-browser tests. */
export const RELEASE = '1.0.0';
const LIVE_DELAY = 400;

export default class TextSearchSlicer extends React.Component<ITextSearchSlicerProps, State> {
    private input = React.createRef<HTMLInputElement>();
    private optionsButton = React.createRef<HTMLButtonElement>();
    private timer?: ReturnType<typeof setTimeout>; private composing = false; private mounted = false;
    constructor(props: ITextSearchSlicerProps) {
        super(props);
        this.state = { text: props.applied?.text || '', selectedIds: props.applied ? [...props.applied.fieldIds] : props.fields.map(f => f.id), date: props.applied?.date || null,
            options: props.options, view: 'search', rowMode: 'summary', localError: '' };
    }
    componentDidMount() { this.mounted = true; }
    componentWillUnmount() { this.mounted = false; this.cancelTimer(); }
    componentDidUpdate(previous: ITextSearchSlicerProps) {
        const before = previous.fields.map(f => f.id), after = this.props.fields.map(f => f.id);
        if (JSON.stringify(before) !== JSON.stringify(after)) this.setState(s => ({ selectedIds: reconcileScope(s.selectedIds, before, after) }), () => { if (this.state.text) this.schedule(); });
        // Re-run a live search only when the new options change what would be searched.
        if (JSON.stringify(previous.options) !== JSON.stringify(this.props.options)) this.setState({ options: this.props.options }, () => { if (this.state.text && !sameQuery(this.props.applied, this.draft())) this.schedule(); });
        if (previous.interactionsAllowed && !this.props.interactionsAllowed) this.cancelTimer();
        if (this.state.date && !this.props.dateFields.some(f => f.id === this.state.date!.fieldId)) this.setState({ date: null });
        // Deliberately do not synchronise text/selection/date with every host
        // update: delayed, array-valued and empty echoes cannot erase a draft.
    }
    private cancelTimer() { if (this.timer !== undefined) clearTimeout(this.timer); this.timer = undefined; }
    private draft(): Query { const o = this.state.options; return { text: this.state.text, fieldIds: this.state.selectedIds, mode: o.mode, logic: o.logic, ignoreAccents: o.ignoreAccents, date: this.state.date }; }
    private submit = () => {
        this.cancelTimer(); if (!this.mounted || this.composing || !this.props.interactionsAllowed) return;
        this.setState({ localError: '' }); this.props.onApply(this.draft());
    };
    private schedule = () => { this.cancelTimer(); if (this.state.options.autoSearch && !this.composing && this.props.interactionsAllowed) this.timer = setTimeout(this.submit, LIVE_DELAY); };
    private onChange = (e: React.ChangeEvent<HTMLInputElement>) => { const text = e.target.value; this.cancelTimer(); this.setState({ text, localError: '' }, this.schedule); };
    private clearSearch = () => {
        this.cancelTimer(); if (!this.props.interactionsAllowed) return;
        if (this.props.onApply({ ...this.draft(), text: '' })) this.setState({ text: '', localError: '' }, () => this.input.current?.focus());
    };
    private keyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (this.composing || e.keyCode === 229) return;
        if (e.key === 'Enter') { e.preventDefault(); this.submit(); }
        if (e.key === 'Escape') { e.preventDefault(); this.cancelTimer(); this.setState({ text: this.props.applied?.text || '', localError: '' }); }
    };
    // ---------- reader options ----------
    private setPrefs = (prefs: SearchPreferences) => {
        if (!this.props.interactionsAllowed) return;
        this.cancelTimer();
        const before = this.state.options, options = withSearchPreferences(before, prefs);
        const query: Query = { ...this.draft(), mode: options.mode, logic: options.logic, ignoreAccents: options.ignoreAccents };
        if (!this.props.onSaveSettings({ options, query })) return;
        const changesResults = options.mode !== before.mode || options.logic !== before.logic || options.ignoreAccents !== before.ignoreAccents;
        this.setState({ options }, () => { if (changesResults && (query.text.trim() || query.date)) this.props.onApply(query); });
    };
    private setFields = (ids: string[]) => {
        if (!this.props.interactionsAllowed || !ids.length) return;
        this.cancelTimer();
        const query: Query = { ...this.draft(), fieldIds: ids };
        if (!this.props.onSaveSettings({ options: this.state.options, query })) return;
        // Apply first: a refused search leaves the ticks as they were (like the date editor).
        if (query.text.trim() && !this.props.onApply(query)) return;
        this.setState({ selectedIds: ids });
    };
    private setDate = (date: DateFilter | null): boolean => {
        if (!this.props.interactionsAllowed) return false;
        if (date && !this.props.onDateAccess()) return false;
        this.cancelTimer();
        if (!this.props.onApply({ ...this.draft(), date })) return false;
        this.setState({ date });
        return true;
    };
    private clearAll = () => {
        this.cancelTimer();
        if (this.props.interactionsAllowed && this.props.onClear()) this.setState({ text: '', date: null, localError: '', view: 'search', rowMode: 'summary' }, () => this.input.current?.focus());
    };
    private resetOptions = () => {
        if (!this.props.interactionsAllowed) return;
        const options = withSearchPreferences(this.state.options, this.props.defaults), ids = this.props.fields.map(f => f.id);
        const query: Query = { ...this.draft(), fieldIds: ids, mode: options.mode, logic: options.logic, ignoreAccents: options.ignoreAccents };
        if (!this.props.onSaveSettings({ options, query })) return;
        this.setState({ options, selectedIds: ids }, () => { if (query.text.trim() || query.date) this.props.onApply(query); });
    };
    private openOptions = (mode: RowMode = 'summary') => {
        this.cancelTimer();
        if (['date', 'dateColumn', 'dateCondition'].includes(mode) && !this.props.onDateAccess()) return;
        this.setState({ view: 'options', rowMode: mode });
    };
    private backToSearch = () => { this.setState({ view: 'search', rowMode: 'summary' }, () => this.input.current?.focus()); };
    private setRowMode = (rowMode: RowMode) => {
        if (['date', 'dateColumn', 'dateCondition'].includes(rowMode) && !this.props.onDateAccess()) return;
        this.setState({ rowMode });
    };

    private hasControls(): boolean {
        const o = this.state.options;
        return o.layout !== 'off' && (o.showMatch || (o.showFields && this.props.fields.length > 1) || (o.showLogic && this.props.fields.length > 1) || (o.showDate && this.props.dateFields.length > 0) || o.showMore);
    }
    render() {
        const p = this.props, o = this.state.options, disabled = !p.interactionsAllowed;
        const names = p.fields.filter(f => this.state.selectedIds.includes(f.id)).map(f => f.displayName);
        const controls = this.hasControls();
        const twoRows = controls && o.layout === 'auto' && p.height >= twoRowHeight(o);
        const status: RowStatus = this.state.localError ? { kind: 'error', message: this.state.localError } : p.status;
        // The search row never grows taller than the visual (a 28 px visual gets a 24 px row).
        const fitted = { ...o, barHeight: Math.max(22, Math.min(o.barHeight, Math.floor(p.height) - 4)) };
        const style = { width: Math.max(0, p.width), height: Math.max(0, p.height), ...lookTokens(fitted, p.theme) } as React.CSSProperties;
        const placeholder = status.kind === 'setup' && !this.state.text ? status.message : o.placeholder || (o.showFieldNames && names.length ? `Search ${names.join(', ')}…` : 'Search…');
        const field = this.state.date ? p.dateFields.find(f => f.id === this.state.date!.fieldId) : undefined;
        const rowProps = {
            options: o, defaults: p.defaults, fields: p.fields, selectedIds: this.state.selectedIds, dateFields: p.dateFields, catalogues: p.catalogues,
            date: this.state.date, matchCount: p.matchCount, status, notices: p.notices, canRetry: p.canRetryLoading, disabled,
            hasFilters: !!(this.state.text.trim() || this.state.date || p.hasActiveFilter),
            mode: this.state.rowMode, onMode: this.setRowMode, onPrefs: this.setPrefs, onFields: this.setFields, onDate: this.setDate,
            onClearAll: this.clearAll, onReset: this.resetOptions, onRetry: () => p.onRetry(this.draft()),
        };
        const inlineOptions = !twoRows && this.state.view === 'options' && controls;
        const narrow = p.width < 340;
        const searchRow = <div className="ff-row ff-row-search">
            <button type="button" className="ff-iconbtn ff-search-btn" aria-label="Search" title="Search (Enter)" onClick={this.submit} disabled={disabled}><SearchIcon /></button>
            <input ref={this.input} className="ff-query" type="search" autoComplete="off" spellCheck={false} maxLength={512}
                aria-label={names.length ? `Search ${names.join(', ')}` : 'Search'} aria-invalid={status.kind === 'error' || undefined}
                placeholder={placeholder} value={this.state.text} onChange={this.onChange} onKeyDown={this.keyDown} disabled={disabled}
                onCompositionStart={() => { this.composing = true; this.cancelTimer(); }} onCompositionEnd={() => { this.composing = false; this.schedule(); }} />
            {!!this.state.text && <button type="button" className="ff-iconbtn ff-clear-text" aria-label="Clear text search" title="Clear text" onClick={this.clearSearch} disabled={disabled}><CrossIcon /></button>}
            {twoRows && !this.state.text && !this.state.date && p.hasActiveFilter && <button type="button" className="ff-iconbtn ff-eraser" aria-label="Clear all FieldFind filters" title="Clear this search" onClick={this.clearAll} disabled={disabled}><EraserIcon /></button>}
            {!twoRows && this.oneRowExtras(controls, narrow, status, field?.displayName)}
        </div>;
        return <div className="ff-root" data-ff-release={RELEASE} data-ff-layout={twoRows ? 'two-rows' : 'one-row'} style={style}>
            <div className={`ff-card ${twoRows ? 'ff-two' : 'ff-one'} ${o.borderShow ? '' : 'ff-noborder'} ${p.theme.highContrast ? 'ff-hc' : ''}`}>
                {inlineOptions ? <OptionsRow key="inline" {...rowProps} inline={true} onBackToSearch={this.backToSearch} /> : searchRow}
                {twoRows && <OptionsRow key="row2" {...rowProps} inline={false} />}
            </div>
            <span className="ff-sr-only" role="status" aria-live="polite">{status.kind === 'error' || status.kind === 'refresh' ? status.message : ''}{o.autoSearch || !this.state.text.trim() || sameQuery(p.applied, this.draft()) ? '' : ' Press Enter to search.'}</span>
        </div>;
    }
    /** One-row layout: compact date chip / date button, problem marker, count and the options button. */
    private oneRowExtras(controls: boolean, narrow: boolean, status: RowStatus, dateName?: string): React.ReactNode {
        const p = this.props, o = this.state.options, disabled = !p.interactionsAllowed, date = this.state.date;
        const out: React.ReactNode[] = [];
        if (date && o.showDate && o.layout !== 'off') {
            out.push(<span key="chip" className="ff-chip-pair ff-chip-active ff-chip-compact">
                <button type="button" className="ff-chip" disabled={disabled} title={`${dateName || 'Date'}: ${dateLabel(date)}`} aria-label={`Edit date filter: ${dateName || 'Date'}, ${dateLabel(date)}`} onClick={() => this.openOptions('date')}><CalendarIcon />{!narrow && <span>{compactDateLabel(date)}</span>}</button>
                <button type="button" className="ff-chip-x" disabled={disabled} aria-label="Clear date filter" title="Clear date" onClick={() => this.setDate(null)}><CrossIcon /></button>
            </span>);
            if (this.state.text && !narrow) out.push(<button key="eraser" type="button" className="ff-iconbtn ff-eraser" aria-label="Clear all FieldFind filters" title="Clear text and date" onClick={this.clearAll} disabled={disabled}><EraserIcon /></button>);
        } else {
            // A filter can be active with nothing typed (e.g. restored with the report): always offer to clear it.
            if (!this.state.text && p.hasActiveFilter) out.push(<button key="eraser" type="button" className="ff-iconbtn ff-eraser" aria-label="Clear all FieldFind filters" title={status.kind === 'refresh' ? status.message : 'Clear this search'} onClick={this.clearAll} disabled={disabled}><EraserIcon /></button>);
            if (o.showDate && o.layout !== 'off' && p.dateFields.length && !narrow) out.push(<button key="cal" type="button" className="ff-iconbtn ff-date-btn" aria-label="Filter by date" title="Filter by date" onClick={() => this.openOptions('date')} disabled={disabled}><CalendarIcon /></button>);
        }
        if (status.kind === 'refresh' && status.action === 'Refresh') out.push(<button key="refresh" type="button" className="ff-iconbtn ff-refresh" aria-label={`Refresh: ${status.message}`} title={status.message} onClick={() => p.onRetry(this.draft())} disabled={disabled}><ResetIcon /></button>);
        else if (status.kind === 'error') out.push(controls
            ? <button key="err" type="button" className="ff-iconbtn ff-problem" aria-label={`Problem: ${status.message}`} title={status.message} onClick={() => this.openOptions('notice')}><AlertIcon /></button>
            : <span key="err" className="ff-iconbtn ff-problem" role="img" aria-label={`Problem: ${status.message}`} title={status.message}><AlertIcon /></span>);
        else if (o.showCount && p.matchCount !== null && (p.matchCount === 0 ? p.width >= 360 : p.width >= 460)) {
            const text = p.matchCount === 0 ? 'No matches' : `${p.matchCount.toLocaleString()} ${p.matchCount === 1 ? 'match' : 'matches'}`;
            out.push(<span key="count" className={`ff-count ${p.matchCount === 0 ? 'ff-status-error' : ''}`} role="status">{text}</span>);
        }
        if (controls) {
            out.push(<span key="sep" className="ff-sep" aria-hidden="true" />);
            out.push(<button key="opt" ref={this.optionsButton} type="button" className="ff-iconbtn ff-options-btn" aria-label="Search options" title="Search options" aria-expanded={false} onClick={() => this.openOptions('summary')} disabled={disabled}><SlidersIcon /></button>);
        }
        return out;
    }
}
