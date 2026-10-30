/** Small host-contract helpers with no SDK/DOM dependency, so the core test
 * suite can cover them. */

/** API 5.x reports the interaction policy in hostCapabilities (dashboard tiles
 * are non-interactive). 0.5.2 read host.allowInteractions, which API 5.4 does
 * not define, so the policy was never applied. A legacy top-level flag is still
 * honoured if a host supplies one. */
export function interactionsAllowedBy(host: unknown): boolean {
    const h = host as { hostCapabilities?: { allowInteractions?: unknown }; allowInteractions?: unknown } | undefined;
    const flag = h?.hostCapabilities?.allowInteractions ?? h?.allowInteractions;
    return flag !== false;
}

/** Readable text colour on a filled accent (Apply button, selected calendar
 * day). 0.5.2 hard-coded white, which disappears on light accents and in
 * high-contrast themes where the accent becomes the foreground colour. */
export function textOnAccent(accent: string, highContrastBackground?: string): string {
    if (highContrastBackground) return highContrastBackground;
    const m = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(accent);
    if (!m) return "#FFFFFF";
    const channel = (hex: string) => { const c = parseInt(hex, 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const luminance = 0.2126 * channel(m[1]) + 0.7152 * channel(m[2]) + 0.0722 * channel(m[3]);
    const dark = 0.011; // relative luminance of #1B1B1B
    const contrastWithWhite = 1.05 / (luminance + 0.05), contrastWithDark = (luminance + 0.05) / (dark + 0.05);
    return contrastWithWhite >= contrastWithDark ? "#FFFFFF" : "#1B1B1B";
}
