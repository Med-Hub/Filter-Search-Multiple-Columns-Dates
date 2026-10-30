import { MatchLogic, MatchMode, Query, SearchField } from "./types";
import { normaliseQuery } from "./query";

/** Where the reader options appear.
 * auto   – a second row under the search bar when the visual is tall enough
 *          (about 70 px), otherwise one row with an options button (0.5.4 default);
 * oneRow – always one row; the options replace the search row on demand;
 * off    – search only, no reader options. */
export type OptionsLayout = "auto" | "oneRow" | "off";

/** Everything the creator sets in the Format pane. Colours are hex strings;
 * the visual fills unset colours from the report theme before calling
 * compactOptions(), so these defaults are only a last-resort fallback
 * (Power BI's default theme). */
export interface CompactOptions {
    // Search (creator defaults; mode/logic/ignoreAccents/autoSearch can be changed by readers for their session)
    mode: MatchMode; logic: MatchLogic; ignoreAccents: boolean; autoSearch: boolean;
    showFieldNames: boolean; placeholder: string;
    // Options row
    layout: OptionsLayout;
    showMatch: boolean; showFields: boolean; showLogic: boolean; showDate: boolean; showMore: boolean; showCount: boolean;
    // Search bar
    barHeight: number; radius: number; background: string; shadow: boolean;
    // Border
    borderShow: boolean; borderColor: string; borderWidth: number; focusColor: string;
    // Text (fontSize in points, like the rest of Power BI's Format pane)
    fontFamily: string; fontSize: number; textColor: string; secondaryColor: string;
    // Accent
    accent: string; iconColor: string;
}

export const DEFAULT_FONT = "Segoe UI, wf_segoe-ui_normal, helvetica, arial, sans-serif";
export const COMPACT_DEFAULTS: Readonly<CompactOptions> = Object.freeze({
    mode: "contains", logic: "any", ignoreAccents: true, autoSearch: true,
    showFieldNames: false, placeholder: "",
    layout: "auto",
    showMatch: true, showFields: true, showLogic: true, showDate: true, showMore: true, showCount: true,
    barHeight: 36, radius: 4, background: "#FFFFFF", shadow: false,
    borderShow: true, borderColor: "#B3B0AD", borderWidth: 1, focusColor: "#118DFF",
    fontFamily: DEFAULT_FONT, fontSize: 10, textColor: "#252423", secondaryColor: "#605E5C",
    accent: "#118DFF", iconColor: "#118DFF",
} as CompactOptions);

export const COLOUR_KEYS = ["background", "borderColor", "focusColor", "textColor", "secondaryColor", "accent", "iconColor"] as const;
export type ColourKey = typeof COLOUR_KEYS[number];

/** #rgb / #rrggbb / rgb(r,g,b) → #RRGGBB; anything else → null. Never lets
 * arbitrary text reach a CSS declaration. */
export function normaliseColour(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const v = value.trim();
    let m = /^#([\da-f])([\da-f])([\da-f])$/i.exec(v);
    if (m) return ("#" + m[1] + m[1] + m[2] + m[2] + m[3] + m[3]).toUpperCase();
    m = /^#([\da-f]{6})$/i.exec(v);
    if (m) return "#" + m[1].toUpperCase();
    m = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+\s*)?\)$/i.exec(v);
    if (m && [m[1], m[2], m[3]].every(x => Number(x) <= 255)) return "#" + [m[1], m[2], m[3]].map(x => Number(x).toString(16).padStart(2, "0")).join("").toUpperCase();
    return null;
}

/** Font stacks from Power BI's font picker: names, quotes, commas, spaces,
 * hyphens and underscores only. */
export function safeFont(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const v = value.trim();
    return v.length > 0 && v.length <= 200 && /^[\w\s,'"\-]+$/.test(v) ? v : null;
}

export function compactOptions(input: unknown): CompactOptions {
    const v = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
    const d = COMPACT_DEFAULTS;
    const number = (key: keyof CompactOptions, lo: number, hi: number) =>
        typeof v[key] === "number" && Number.isFinite(v[key]) ? Math.round(Math.min(hi, Math.max(lo, v[key] as number))) : d[key] as number;
    const boolean = (key: keyof CompactOptions) => typeof v[key] === "boolean" ? v[key] as boolean : d[key] as boolean;
    const colour = (key: ColourKey) => normaliseColour(v[key]) || d[key];
    const placeholder = typeof v.placeholder === "string" ? v.placeholder.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 80) : d.placeholder;
    return {
        mode: ["contains", "startsWith", "exact"].includes(v.mode as string) ? v.mode as MatchMode : d.mode,
        logic: v.logic === "all" ? "all" : "any",
        ignoreAccents: boolean("ignoreAccents"), autoSearch: boolean("autoSearch"),
        showFieldNames: boolean("showFieldNames"), placeholder,
        layout: ["auto", "oneRow", "off"].includes(v.layout as string) ? v.layout as OptionsLayout : d.layout,
        showMatch: boolean("showMatch"), showFields: boolean("showFields"), showLogic: boolean("showLogic"),
        showDate: boolean("showDate"), showMore: boolean("showMore"), showCount: boolean("showCount"),
        barHeight: number("barHeight", 28, 52), radius: number("radius", 0, 24), background: colour("background"), shadow: boolean("shadow"),
        borderShow: boolean("borderShow"), borderColor: colour("borderColor"), borderWidth: number("borderWidth", 1, 4), focusColor: colour("focusColor"),
        fontFamily: safeFont(v.fontFamily) || d.fontFamily, fontSize: number("fontSize", 8, 18),
        textColor: colour("textColor"), secondaryColor: colour("secondaryColor"),
        accent: colour("accent"), iconColor: colour("iconColor"),
    };
}

/** A reader change made in the options row, validated before it is applied. */
export interface SettingsResult { query: Query; options: CompactOptions; retryLoading?: boolean; action?: "apply"|"clearSearch"|"clearDate"|"resetAll"|"restoreDefaults"; valid?: boolean; error?: string; }
export function settingsResult(input: unknown, fields: readonly SearchField[], dates: readonly SearchField[] = []): SettingsResult {
    if (!input || typeof input !== "object") throw new Error("The settings response is not valid.");
    const value = input as SettingsResult;
    const opts = compactOptions(value.options);
    const query = normaliseQuery({ ...value.query, mode: opts.mode, logic: opts.logic, ignoreAccents: opts.ignoreAccents });
    const available = new Set(fields.map(f => f.id));
    if ((fields.length && !query.fieldIds.length) || query.fieldIds.some(id => !available.has(id))) {
        throw new Error("Search fields changed. Choose the fields again.");
    }
    if (query.date && !dates.some(f => f.id === query.date!.fieldId)) throw new Error("Date fields changed. Choose the date column again.");
    const action = ["apply", "clearSearch", "clearDate", "resetAll", "restoreDefaults"].includes(value.action || "") ? value.action : "apply";
    if (value.valid === false) throw new Error(value.error || "Check the search/date options.");
    return { query, options: opts, retryLoading: value.retryLoading === true, action };
}

/** Only these reader preferences may change through the options row. */
export const SEARCH_OPTION_KEYS = ["mode", "logic", "ignoreAccents", "autoSearch"] as const;
export type SearchPreferences = Partial<Pick<CompactOptions, typeof SEARCH_OPTION_KEYS[number]>>;
export function withSearchPreferences(base: CompactOptions, input: unknown): CompactOptions {
    const raw = input && typeof input === "object" ? input as Record<string, unknown> : {};
    const filtered: Record<string, unknown> = {};
    for (const key of SEARCH_OPTION_KEYS) if (Object.prototype.hasOwnProperty.call(raw, key)) filtered[key] = raw[key];
    return compactOptions({ ...base, ...filtered });
}
