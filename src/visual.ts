/*
 * Power BI Visualizations
 * Copyright (c) Microsoft Corporation. All rights reserved. MIT License.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
// FieldFind: adaptation of DataBrothers' React lifecycle + formatting host shell.
// Microsoft's standalone Text Filter is a reference only; no d3 visual was cloned.
import type powerbi from "powerbi-visuals-api";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { VisualFormattingSettingsModel, readCompactOptions, applyThemeDefaults } from "./settings";
import { CompactOptions, COMPACT_DEFAULTS, SEARCH_OPTION_KEYS, SearchPreferences, SettingsResult, settingsResult, withSearchPreferences } from "./core/compactOptions";
import { availableDates, DateCatalogue } from "./core/dates";
import { prepareSearch } from "./core/matcher";
import { normaliseQuery } from "./core/query";
import { ThemeColours, readTheme, themeColourDefaults } from "./core/theme";
import TextSearchSlicer from "./components/TextSearchSlicer";
import { RowStatus } from "./components/OptionsRow";
import TextSearchFilterService from "./services/textSearchFilterService";
import { HostFilterTracker } from "./core/filterState";
import { readOwnedFilter } from "./powerbi/filterObservation";
import { SearchController } from "./core/controller";
import { Query, SearchField, LIMITS, Snapshot, SearchError } from "./core/types";
import { DataLoader, LOAD_FAILURE_MESSAGES } from "./core/dataLoader";
import { readBindings, bindingNotices } from "./powerbi/bindings";
import { readSnapshot, InputTable } from "./powerbi/dataReader";
import { interactionsAllowedBy } from "./core/hostPolicy";
import { DateLicence } from "./core/dateLicence";
import { RenderLifecycle, RenderCompletion } from "./core/renderLifecycle";
import { DATE_PRO_SERVICE_ID } from "./licensing/config";
import { licenceTransport } from "./licensing/hostTransport";
import { licenceMessage } from "./licensing/messages";
// Type aliases (not `import X = …`): valid with `import type` under the
// official SDK compiler, which rejected the 0.5.2 import-equals form (TS1380).
type VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
type VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
type IVisualHost = powerbi.extensibility.visual.IVisualHost;
const SETUP_MESSAGE = "Add a Record key and Search fields in Build visual";
export class Visual implements powerbi.extensibility.visual.IVisual {
    private readonly host: IVisualHost;
    private readonly target: HTMLElement;
    private readonly rendering: RenderLifecycle<VisualUpdateOptions>;
    private readonly formattingService = new FormattingSettingsService();
    private settings = new VisualFormattingSettingsModel();
    private readonly controller: SearchController;
    private readonly dateLicence: DateLicence;
    private licenceNotice = "";
    private fields: readonly SearchField[] = [];
    private dateFields: readonly SearchField[] = [];
    private notices: string[] = [];
    private pendingQuery: Query | null = null;
    private draining = false;
    private drainTimer?: ReturnType<typeof setTimeout>;
    private viewport = { width: 400, height: 40 };
    private objects: unknown = undefined;
    private theme: ThemeColours;
    private options: CompactOptions = { ...COMPACT_DEFAULTS };
    private formatDefaults: CompactOptions = { ...COMPACT_DEFAULTS };
    private searchPreferences: SearchPreferences = {};
    private matchCount: number | null = null;
    private destroyed = false;
    private message = "";
    private readonly loader: DataLoader;
    private hasData = false;
    private bindingSignature = "";
    private readonly filterTracker = new HostFilterTracker();
    private hasError = false;
    private readonly contextMenu: (event: MouseEvent) => void;
    private warmTimer?: ReturnType<typeof setTimeout>;
    private dateCache: { snapshot: Snapshot | null; catalogues: DateCatalogue[] } = { snapshot: null, catalogues: [] };
    constructor(options?: VisualConstructorOptions) {
        if (!options?.host || !options.element) throw new Error("FieldFind requires host and element options.");
        this.host = options.host; this.target = options.element;
        this.rendering = new RenderLifecycle(this.host.eventService);
        this.theme = readTheme(this.host.colorPalette);
        this.dateLicence = new DateLicence(DATE_PRO_SERVICE_ID, licenceTransport(this.host), () => {
            if (this.destroyed) return;
            if (this.licenceNotice) this.licenceNotice = licenceMessage(this.dateLicence.state, this.host.locale);
            // Do not change the draft, selected fields, date, caret or report filter.
            this.render();
        });
        const adapter = new TextSearchFilterService(this.host);
        this.controller = new SearchController({ apply: filter => {
            const rollback = this.filterTracker.expect(filter);
            try { adapter.apply(filter); } catch (error) { rollback(); throw error; }
        }}, query => this.authorizeDateQuery(query));
        this.loader = new DataLoader(() => this.host.fetchMoreData(true), reason => {
            if (this.destroyed) return;
            this.hasError = true; this.matchCount = null;
            this.controller.invalidate(LOAD_FAILURE_MESSAGES[reason]);
            this.message = this.controller.message;
            this.render();
        });
        const selectionManager = this.host.createSelectionManager();
        this.contextMenu = event => {
            selectionManager.showContextMenu({ measures: [], dataMap: {} }, { x: event.clientX, y: event.clientY });
            event.preventDefault();
        };
        this.target.addEventListener("contextmenu", this.contextMenu);
        this.refreshFormatting();
        this.render();
        void this.dateLicence.start();
    }
    /** Format-pane values with unset colours taken from the current report
     * theme. Runs on every update: theme changes can arrive without data. */
    private refreshFormatting(dataViews?: powerbi.DataView[]): void {
        if (dataViews?.[0]) {
            this.settings = this.formattingService.populateFormattingSettingsModel(VisualFormattingSettingsModel, dataViews);
            this.objects = dataViews[0].metadata?.objects;
        }
        applyThemeDefaults(this.settings, this.objects, themeColourDefaults(this.theme));
        const defaults = readCompactOptions(this.settings);
        // Creator changes to a search default win. Unrelated formatting
        // and host data echoes do not erase the reader's session choices.
        for (const key of SEARCH_OPTION_KEYS) {
            if (defaults[key] !== this.formatDefaults[key]) delete this.searchPreferences[key];
        }
        this.formatDefaults = defaults;
        this.options = withSearchPreferences(defaults, this.searchPreferences);
    }
    public update(options: VisualUpdateOptions): void {
        if (this.destroyed) return;
        const completion = this.rendering.begin(options);
        let fresh = false;
        try {
            this.viewport = options.viewport;
            this.theme = readTheme(this.host.colorPalette);
            const dataView = options.dataViews?.[0];
            fresh = !!(options.type & 2 /* VisualUpdateType.Data */);
            this.refreshFormatting(dataView ? options.dataViews : undefined);
            if(fresh || (!this.hasData && dataView?.table)){
                const bindings=readBindings((dataView?.table?.columns || dataView?.metadata?.columns || []) as import("./powerbi/fieldResolver").ColumnMetadata[]);
                this.fields=bindings.search.map(f=>f.field);this.dateFields=bindings.dates.map(f=>f.field);
                this.notices=bindingNotices(bindings);
            }
            // Resize/style-only updates may legitimately omit dataViews. They must
            // not erase the current setup, draft, complete candidate set or errors.
            if (fresh || (!this.hasData && dataView?.table)) {
                this.hasError = false;
                if (!dataView?.table) {
                    this.hasData = false; this.bindingSignature = ""; this.matchCount = null;
                    this.loader.reset();
                    this.controller.invalidate(SETUP_MESSAGE);
                } else {
                    const snapshot = readSnapshot(dataView.table as unknown as InputTable, dataView.metadata.segment != null);
                    const binding = JSON.stringify([snapshot.keyTarget, snapshot.fields.map(field => field.id), (snapshot.dateFields||[]).map(field=>field.id)]);
                    const newContext = !this.hasData || binding !== this.bindingSignature ||
                        options.operationKind === 0 /* VisualDataChangeOperationKind.Create */;
                    this.fields = snapshot.fields; this.dateFields=snapshot.dateFields||[];
                    this.hasData = true; this.bindingSignature = binding;
                    const owned = readOwnedFilter(dataView.metadata.objects, options.jsonFilters, snapshot.keyTarget);
                    if (owned.known) {
                        const observation = this.filterTracker.observe(owned.filter);
                        if (this.filterTracker.staleEcho) { this.renderUpdate(completion); return; }
                        if (observation === "cleared") { this.controller.observeExternalClear(); this.matchCount = null; }
                        else if (observation === "replaced") { this.controller.markSavedFilter(); this.matchCount = null; }
                    }
                    this.controller.ingest(snapshot, fresh);
                    if (!snapshot.complete && snapshot.rows.length >= LIMITS.rows) {
                        this.loader.reset(); this.hasError = true;
                        this.controller.invalidate("More candidate rows exist than the prototype permits. Search has not been applied.");
                    } else this.loader.receive(snapshot.rows.length, snapshot.complete, newContext);
                }
                this.message = this.controller.message;
            }
            if (fresh) { this.scheduleDrain(); this.scheduleWarmUp(); }
        } catch (error) {
            if (fresh) { this.hasData = false; this.bindingSignature = ""; this.pendingQuery=null; }
            this.loader.reset();
            this.hasError = true; this.matchCount = null;
            this.controller.invalidate(error instanceof Error ? error.message : "Unable to read the search fields.");
            this.message = this.controller.message;
        }
        // Even a deliberate invalid-data screen commits normally. Only a real
        // renderer failure signals renderingFailed. Never retry that renderer.
        this.renderUpdate(completion);
    }
    private renderUpdate(completion: RenderCompletion): void {
        try { this.render(() => completion.finish(), () => completion.fail()); }
        catch { completion.fail(); }
    }
    private retryLoading(): void {
        if (this.destroyed || !this.loader.retry()) return;
        this.hasError = false;
        this.controller.invalidate("Requesting the remaining records. Your draft and previous filter are kept.");
        this.message = this.controller.message;
        this.render();
    }
    /** Retry after a loading failure or a changed data context; the reader's
     * current query runs again once all records are back. */
    private retry(query: Query): void {
        if (this.destroyed || !this.interactionsAllowed) return;
        try {
            const normalised = normaliseQuery(query);
            this.authorizeDateQuery(normalised);
            this.pendingQuery = normalised;
        } catch (error) {
            this.pendingQuery = null;
            if (error instanceof SearchError && error.code === 'date-licence') { this.render(); return; }
        }
        if (this.pendingQuery && !this.pendingQuery.text && !this.pendingQuery.date) this.pendingQuery = null;
        if (this.loader.canRetry) { this.retryLoading(); return; }
        if (this.controller.needsRefresh) {
            try { this.loader.reset(); this.controller.clear(); this.hasError = false; this.message = this.controller.message; }
            catch { this.hasError = true; this.message = "Power BI could not clear this search. Try again."; }
            this.scheduleDrain(); this.render();
        }
    }
    private scheduleDrain(): void {
        if (!this.pendingQuery || this.draining || this.destroyed || this.drainTimer!==undefined) return;
        this.drainTimer=setTimeout(()=>{
            this.drainTimer=undefined;
            if(!this.pendingQuery || !this.controller.canSearch || this.destroyed)return;
            const query=this.pendingQuery;this.pendingQuery=null;this.draining=true;
            try {this.apply(query);} finally {this.draining=false;}
        },0);
    }
    /** Prepare the search cache while the reader is not typing. */
    private scheduleWarmUp(): void {
        if (this.warmTimer !== undefined) clearTimeout(this.warmTimer);
        this.warmTimer = setTimeout(() => { this.warmTimer = undefined; if (!this.destroyed) prepareSearch(this.controller.currentSnapshot); }, 150);
    }
    private catalogues(): DateCatalogue[] {
        if (!this.dateLicence.allowed) return [];
        const snapshot = this.controller.currentSnapshot;
        if (snapshot !== this.dateCache.snapshot) this.dateCache = { snapshot, catalogues: availableDates(snapshot) };
        return this.dateCache.catalogues;
    }
    private get interactionsAllowed(): boolean { return interactionsAllowedBy(this.host); }
    private apply(input: Query): boolean {
        if (this.destroyed || !this.interactionsAllowed) return false;
        try {
            const query=normaliseQuery(input);
            if(!query.text && !query.date)return this.clear();
            this.authorizeDateQuery(query);
            if(this.controller.canSearch){
                this.pendingQuery=null;
                const result=this.controller.submit(query);
                this.matchCount=result?result.keys.length:null;
                this.message=this.controller.message;this.hasError=false;
            } else if(this.controller.needsRefresh || this.controller.waitingForData || this.hasData){
                this.pendingQuery=query;this.matchCount=null;
                if(this.controller.needsRefresh){this.loader.reset();this.controller.clear();}
                this.message="Refreshing records. Your typed text is kept; the search runs when all records are ready.";
                this.hasError=false;this.scheduleDrain();
            } else throw new Error(this.controller.message || SETUP_MESSAGE);
            this.render();return true;
        } catch(error){
            this.pendingQuery=null;
            if (error instanceof SearchError && error.code === 'date-licence') { this.render(); return false; }
            this.hasError=true;
            this.message=error instanceof Error?error.message:"Search was not applied.";
            this.render();return false;
        }
    }
    private clear(): boolean {
        this.pendingQuery=null;
        if(this.drainTimer!==undefined){clearTimeout(this.drainTimer);this.drainTimer=undefined;}
        if (this.destroyed || !this.interactionsAllowed) return false;
        let succeeded = false;
        try { this.controller.clear(); succeeded = true; this.message = this.controller.message; this.hasError = false; this.matchCount = null; }
        catch { this.hasError = true; this.message = "Power BI could not clear this search. Try again."; }
        if (succeeded) { this.licenceNotice = ""; void this.dateLicence.clearNotification(); }
        this.render(); return succeeded;
    }
    /** A single gate protects UI, API callbacks, saved queries and queued drains.
     * We never infer entitlement from the filter, record data or author mode. */
    private authorizeDateQuery(query: Query): void {
        if (!query.date) { this.licenceNotice = ""; void this.dateLicence.clearNotification(); return; }
        if (!this.requestDateAccess()) throw new SearchError('date-licence', licenceMessage(this.dateLicence.state, this.host.locale));
    }
    private requestDateAccess(): boolean {
        if (this.destroyed || !this.interactionsAllowed) return false;
        if (this.dateLicence.allowed) { this.licenceNotice = ""; return true; }
        const message = licenceMessage(this.dateLicence.state, this.host.locale);
        // Missing paid licence: Microsoft's banner ONLY, not our own paywall UI.
        // Pending/offline/unsupported/test-config cases are technical notes, not a sales prompt.
        this.licenceNotice = this.dateLicence.state === 'unlicensed' ? "" : message;
        void this.dateLicence.notifyBlocked(message);
        this.render(); return false;
    }
    private saveSettings(result: SettingsResult): boolean {
        if (this.destroyed || !this.interactionsAllowed) return false;
        try {
            const validated = settingsResult(result, this.fields, this.dateFields);
            const { mode, logic, ignoreAccents, autoSearch } = validated.options;
            this.searchPreferences = { mode, logic, ignoreAccents, autoSearch };
            this.options = withSearchPreferences(this.formatDefaults, this.searchPreferences);
            // Reader search controls NEVER persist report appearance properties.
            this.render(); return true;
        } catch (error) {
            this.hasError = true;
            this.message = error instanceof Error ? error.message : "Search options could not be changed.";
            this.render(); return false;
        }
    }
    private status(): RowStatus {
        if (this.hasError) return { kind: "error", message: this.message || "Search was not applied." };
        if (!this.hasData) return { kind: "setup", message: SETUP_MESSAGE };
        // Another slicer changed this visual's records, or Power BI restored a
        // filter whose text FieldFind does not know: say so and offer the fix.
        if (this.controller.needsRefresh) return this.controller.applied
            ? { kind: "refresh", label: "Data changed", action: "Refresh", message: "The report data changed after this search. Refresh to search the current records; until then the previous filter stays applied." }
            : { kind: "refresh", label: "Saved filter", action: "Clear", message: "A FieldFind filter is active, but its search text was not saved with the report. Clear it, or type a new search." };
        if (!this.controller.canSearch) return { kind: "loading", message: "Loading records…" };
        return { kind: "ok", message: "" };
    }
    private render(done?: () => void, failed?: () => void): void {
        if (this.destroyed) { failed?.(); return; }
        try {
        const status = this.status();
        ReactDOM.render(React.createElement(TextSearchSlicer, {
            fields: this.fields, dateFields: this.dateFields, catalogues: this.catalogues(),
            options: this.options, defaults: this.formatDefaults, theme: this.theme, width: this.viewport.width, height: this.viewport.height,
            status, notices: this.licenceNotice ? [...this.notices, this.licenceNotice] : this.notices, matchCount: status.kind === "ok" && this.controller.applied ? this.matchCount : null,
            canSearch: this.controller.canSearch, applied: this.controller.applied, hasActiveFilter: this.controller.hasFilter,
            canRetryLoading: this.loader.canRetry || this.controller.needsRefresh, interactionsAllowed: this.interactionsAllowed,
            onApply: query => this.apply(query), onClear: () => this.clear(), onSaveSettings: result => this.saveSettings(result), onRetry: query => this.retry(query), onDateAccess: () => this.requestDateAccess(),
        }), this.target, done);
        } catch {
            // Do not call ReactDOM.render again from its own failure path.
            this.hasError = true;
            this.message = "The visual could not render. Refresh the report to retry.";
            failed?.();
        }
    }
    public getFormattingModel(): powerbi.visuals.FormattingModel {
        try { return this.formattingService.buildFormattingModel(this.settings); }
        catch { return { cards: [] }; }
    }
    public destroy(): void {
        this.destroyed = true; this.rendering.destroy(); this.dateLicence.dispose(); this.pendingQuery=null; if(this.drainTimer!==undefined)clearTimeout(this.drainTimer); if(this.warmTimer!==undefined)clearTimeout(this.warmTimer); this.loader.dispose();
        this.target.removeEventListener("contextmenu", this.contextMenu);
        this.fields = []; this.controller.invalidate("Visual destroyed.");
        try { ReactDOM.unmountComponentAtNode(this.target); } catch { /* Disposal must not throw into Power BI. */ }
    }
}
