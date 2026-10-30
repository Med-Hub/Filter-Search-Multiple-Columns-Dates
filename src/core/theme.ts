/** Report-theme colours for FieldFind (0.5.4).
 *
 * Power BI gives a custom visual the report theme through host.colorPalette:
 * the structural colours (foreground = firstLevelElements, foregroundNeutral-
 * Secondary = secondLevelElements, backgroundLight = thirdLevelElements,
 * foregroundNeutralTertiary = fourthLevelElements, background, backgroundNeutral
 * = secondaryBackground) and the data colours through getColor(key). Every
 * colour the creator has not set in the Format pane comes from here, so an
 * imported FieldFind matches the report and follows theme changes. */
import { CompactOptions, ColourKey, normaliseColour } from "./compactOptions";
import { textOnAccent } from "./hostPolicy";

export interface ThemeColours {
    foreground: string; background: string; secondary: string; tertiary: string;
    light: string; neutral: string; accent: string; negative: string;
    highContrast: null | { foreground: string; background: string; selected: string };
}
/** Power BI's default theme, used only when the host does not supply a colour. */
export const DEFAULT_THEME: Readonly<ThemeColours> = Object.freeze({
    foreground: "#252423", background: "#FFFFFF", secondary: "#605E5C", tertiary: "#B3B0AD",
    light: "#F3F2F1", neutral: "#C8C6C4", accent: "#118DFF", negative: "#D64554", highContrast: null,
});
/** getColor() hands out the theme's data colours in order of first request;
 * FieldFind requests only this key, so it receives the first theme colour. */
export const ACCENT_KEY = "FieldFind accent";

export function readTheme(palette: unknown): ThemeColours {
    const p = (palette && typeof palette === "object" ? palette : {}) as Record<string, unknown> & { getColor?: (key: string) => { value?: unknown } };
    const pick = (name: string, fallback: string) => normaliseColour((p[name] as { value?: unknown } | undefined)?.value) || fallback;
    let accent: string | null = null;
    try { if (typeof p.getColor === "function") accent = normaliseColour(p.getColor(ACCENT_KEY)?.value); } catch { accent = null; }
    const t: ThemeColours = {
        foreground: pick("foreground", DEFAULT_THEME.foreground),
        background: pick("background", DEFAULT_THEME.background),
        secondary: pick("foregroundNeutralSecondary", DEFAULT_THEME.secondary),
        tertiary: pick("foregroundNeutralTertiary", DEFAULT_THEME.tertiary),
        light: pick("backgroundLight", DEFAULT_THEME.light),
        neutral: pick("backgroundNeutral", DEFAULT_THEME.neutral),
        accent: accent || DEFAULT_THEME.accent,
        negative: pick("negative", DEFAULT_THEME.negative),
        highContrast: null,
    };
    if (p.isHighContrast === true) t.highContrast = { foreground: t.foreground, background: t.background, selected: pick("foregroundSelected", t.foreground) };
    return t;
}

/** Format-pane defaults for colours the creator has not set. */
export function themeColourDefaults(t: ThemeColours): Record<ColourKey, string> {
    return { background: t.background, borderColor: t.tertiary, focusColor: t.accent, textColor: t.foreground, secondaryColor: t.secondary, accent: t.accent, iconColor: t.accent };
}

function rgb(hex: string): [number, number, number] {
    const h = normaliseColour(hex) || "#000000";
    return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}
function hex(c: readonly number[]): string { return "#" + c.map(x => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join("").toUpperCase(); }
/** weight of `a` in an sRGB mix of a over b. */
export function mix(a: string, b: string, weight: number): string {
    const x = rgb(a), y = rgb(b);
    return hex(x.map((v, i) => v * weight + y[i] * (1 - weight)));
}
export function luminance(colour: string): number {
    const ch = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const [r, g, b] = rgb(colour);
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}
export function contrast(a: string, b: string): number {
    const x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
/** Use `colour` for text/icons only when it stays legible on `background`. */
export function readable(colour: string, background: string, minimum: number, fallback: string): string {
    return contrast(colour, background) >= minimum ? colour : fallback;
}
export function isDark(background: string): boolean { return luminance(background) < 0.2; }
/** Black or white, whichever reads better on `background`. */
export function blackOrWhite(background: string): string { return contrast("#000000", background) >= contrast("#FFFFFF", background) ? "#000000" : "#FFFFFF"; }
/** `colour` moved toward black or white just far enough to reach `minimum`
 * contrast on every background, keeping its hue (a darker blue, not grey).
 * When that would take more than `limit` of the mix, `fallback` is used. */
export function legible(colour: string, backgrounds: readonly string[], minimum: number, fallback: string, limit = 0.45): string {
    const worst = (c: string) => Math.min(...backgrounds.map(b => contrast(c, b)));
    if (worst(colour) >= minimum) return colour;
    const toward = blackOrWhite(backgrounds[0]);
    for (let w = 0.05; w <= limit + 1e-9; w += 0.05) { const c = mix(toward, colour, w); if (worst(c) >= minimum) return c; }
    return fallback;
}

/** CSS custom properties for the bar, options row and controls. */
export function lookTokens(o: CompactOptions, t: ThemeColours): Record<string, string> {
    const hc = t.highContrast;
    const bg = hc ? hc.background : o.background;
    // Text that is unreadable on the bar background (e.g. a dark background set
    // in the Format pane with the theme's dark text) falls back to a legible colour.
    const fg = hc ? hc.foreground : readable(o.textColor, bg, 3, readable(t.foreground, bg, 4.5, readable(t.background, bg, 4.5, blackOrWhite(bg))));
    const muted = hc ? hc.foreground : readable(o.secondaryColor, bg, 3, mix(fg, bg, 0.72));
    const accent = hc ? hc.selected : o.accent;
    const soft = hc ? bg : mix(fg, bg, isDark(bg) ? 0.12 : 0.06);
    const accentSoft = hc ? bg : mix(accent, bg, isDark(bg) ? 0.28 : 0.13);
    const border = hc ? hc.foreground : o.borderColor;
    const errorFallback = isDark(bg) ? "#F1707B" : "#A4262C";
    const fontPx = Math.max(10, Math.min(o.barHeight - 12, Math.round(o.fontSize * 4 / 3 * 10) / 10));
    const row2 = Math.max(26, Math.round(o.barHeight * 0.8));
    const inner = Math.max(0, Math.min(12, o.radius - 2));
    return {
        "--ff-bg": bg,
        "--ff-fg": fg,
        "--ff-muted": muted,
        "--ff-border": border,
        "--ff-bw": o.borderShow ? `${o.borderWidth}px` : "0px",
        // Focus must stay visible (3:1) even with a light theme colour such as yellow.
        "--ff-focus": hc ? hc.selected : readable(o.focusColor, bg, 3, fg),
        "--ff-accent": accent,
        // Accent-coloured text (selected choices, links) is small: 4.5:1 on every fill it sits on.
        "--ff-accent-text": hc ? hc.selected : legible(o.accent, [bg, soft, accentSoft], 4.5, fg),
        "--ff-icon": hc ? hc.foreground : readable(o.iconColor, bg, 3, fg),
        "--ff-on-accent": textOnAccent(accent, hc?.background),
        "--ff-soft": soft,
        "--ff-accent-soft": accentSoft,
        "--ff-divider": hc ? fg : mix(o.borderShow ? border : t.tertiary, bg, 0.6),
        "--ff-error": hc ? hc.foreground : readable(t.negative, bg, 4.5, errorFallback),
        "--ff-font": o.fontFamily,
        "--ff-size": `${fontPx}px`,
        "--ff-size-sm": `${Math.max(10, Math.round(fontPx * 0.92 * 10) / 10)}px`,
        "--ff-row1": `${o.barHeight}px`,
        "--ff-row2": `${row2}px`,
        "--ff-radius": `${o.radius}px`,
        "--ff-radius-in": `${inner}px`,
        "--ff-shadow": o.shadow && !hc ? (isDark(bg) ? "0 1px 4px #00000080" : "0 1px 3px #0000001F, 0 1px 2px #00000012") : "none",
    };
}
/** Height the two-row layout needs inside the visual (rows + divider + 2 px padding top/bottom). */
export function twoRowHeight(o: CompactOptions): number {
    return o.barHeight + Math.max(26, Math.round(o.barHeight * 0.8)) + 1 + 4;
}
