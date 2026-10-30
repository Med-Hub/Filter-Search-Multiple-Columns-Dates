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
// Adapted from databrotherscz/text-search-slicer/src/settings.ts (MIT).
// 0.5.4: one card per topic in Power BI's Format pane. Colours the creator has
// not set show (and use) the report theme; "Reset to default" returns to it.
import type powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import { COMPACT_DEFAULTS, CompactOptions, compactOptions, ColourKey, normaliseColour } from "./core/compactOptions";
import FormattingSettingsCard = formattingSettings.Card;
import FormattingSettingsSlice = formattingSettings.Slice;

/** Format-pane limits that match compactOptions() clamping. Numeric literals
 * (ValidatorType.Min = 0, Max = 1) keep the offline build free of API values. */
function range(min: number, max: number): powerbi.visuals.NumUpDownFormat {
    return { minValue: { type: 0 as powerbi.visuals.ValidatorType.Min, value: min }, maxValue: { type: 1 as powerbi.visuals.ValidatorType.Max, value: max } };
}
const colour = (value: string) => ({ value });
export const MODE_ITEMS = [{ value: "contains", displayName: "Contains" }, { value: "startsWith", displayName: "Starts with" }, { value: "exact", displayName: "Exact" }];
export const LOGIC_ITEMS = [{ value: "any", displayName: "Any selected field" }, { value: "all", displayName: "Every selected field" }];
export const LAYOUT_ITEMS = [{ value: "auto", displayName: "Second row (when there is room)" }, { value: "oneRow", displayName: "Behind an options button" }, { value: "off", displayName: "Hidden" }];
const D = COMPACT_DEFAULTS;

export class SearchCard extends FormattingSettingsCard {
    public mode = new formattingSettings.ItemDropdown({ name: "mode", displayName: "Match type", items: MODE_ITEMS, value: MODE_ITEMS[0] });
    public logic = new formattingSettings.ItemDropdown({ name: "logic", displayName: "Match in", items: LOGIC_ITEMS, value: LOGIC_ITEMS[0] });
    public ignoreAccents = new formattingSettings.ToggleSwitch({ name: "ignoreAccents", displayName: "Ignore accents", value: D.ignoreAccents });
    public autoSearch = new formattingSettings.ToggleSwitch({ name: "autoSearch", displayName: "Search as you type", value: D.autoSearch });
    public placeholder = new formattingSettings.TextInput({ name: "placeholder", displayName: "Placeholder text", value: D.placeholder, placeholder: "Search…" });
    public showFieldNames = new formattingSettings.ToggleSwitch({ name: "showFieldNames", displayName: "Field names in placeholder", value: D.showFieldNames });
    name = "searchOptions";
    displayName = "Search";
    slices: FormattingSettingsSlice[] = [this.mode, this.logic, this.ignoreAccents, this.autoSearch, this.placeholder, this.showFieldNames];
}

export class OptionsRowCard extends FormattingSettingsCard {
    public layout = new formattingSettings.ItemDropdown({ name: "layout", displayName: "Show options", items: LAYOUT_ITEMS, value: LAYOUT_ITEMS[0] });
    public showMatch = new formattingSettings.ToggleSwitch({ name: "showMatch", displayName: "Match type", value: D.showMatch });
    public showFields = new formattingSettings.ToggleSwitch({ name: "showFields", displayName: "Search fields", value: D.showFields });
    public showLogic = new formattingSettings.ToggleSwitch({ name: "showLogic", displayName: "Any or every field", value: D.showLogic });
    public showDate = new formattingSettings.ToggleSwitch({ name: "showDate", displayName: "Date filter", value: D.showDate });
    public showMore = new formattingSettings.ToggleSwitch({ name: "showMore", displayName: "Accents and live search", value: D.showMore });
    public showCount = new formattingSettings.ToggleSwitch({ name: "showCount", displayName: "Match count", value: D.showCount });
    name = "optionsRow";
    displayName = "Reader options";
    description = "What readers can change. The second row needs a visual about 70 px tall; shorter visuals show an options button.";
    slices: FormattingSettingsSlice[] = [this.layout, this.showMatch, this.showFields, this.showLogic, this.showDate, this.showMore, this.showCount];
}

export class SearchBarCard extends FormattingSettingsCard {
    public barHeight = new formattingSettings.NumUpDown({ name: "barHeight", displayName: "Row height (px)", value: D.barHeight, options: range(28, 52) });
    public radius = new formattingSettings.NumUpDown({ name: "radius", displayName: "Corner radius (px)", value: D.radius, options: range(0, 24) });
    public background = new formattingSettings.ColorPicker({ name: "background", displayName: "Background", value: colour(D.background) });
    public shadow = new formattingSettings.ToggleSwitch({ name: "shadow", displayName: "Shadow", value: D.shadow });
    name = "searchBar";
    displayName = "Search bar";
    slices: FormattingSettingsSlice[] = [this.barHeight, this.radius, this.background, this.shadow];
}

export class BorderCard extends FormattingSettingsCard {
    public show = new formattingSettings.ToggleSwitch({ name: "show", displayName: "Border", value: D.borderShow, topLevelToggle: true });
    public color = new formattingSettings.ColorPicker({ name: "color", displayName: "Colour", value: colour(D.borderColor) });
    public width = new formattingSettings.NumUpDown({ name: "width", displayName: "Width (px)", value: D.borderWidth, options: range(1, 4) });
    public focusColor = new formattingSettings.ColorPicker({ name: "focusColor", displayName: "Colour while typing", value: colour(D.focusColor) });
    name = "barBorder";
    displayName = "Border";
    slices: FormattingSettingsSlice[] = [this.show, this.color, this.width, this.focusColor];
}

export class TextCard extends FormattingSettingsCard {
    public font = new formattingSettings.FontControl({
        name: "font", displayName: "Font",
        fontFamily: new formattingSettings.FontPicker({ name: "fontFamily", displayName: "Font", value: D.fontFamily }),
        fontSize: new formattingSettings.NumUpDown({ name: "fontSize", displayName: "Text size", value: D.fontSize, options: range(8, 18) }),
    });
    public color = new formattingSettings.ColorPicker({ name: "color", displayName: "Text colour", value: colour(D.textColor) });
    public secondaryColor = new formattingSettings.ColorPicker({ name: "secondaryColor", displayName: "Placeholder and hints", value: colour(D.secondaryColor) });
    name = "barText";
    displayName = "Text";
    slices: FormattingSettingsSlice[] = [this.font, this.color, this.secondaryColor];
}

export class AccentCard extends FormattingSettingsCard {
    public accent = new formattingSettings.ColorPicker({ name: "accent", displayName: "Accent colour", description: "Selected options, Apply and switches", value: colour(D.accent) });
    public iconColor = new formattingSettings.ColorPicker({ name: "iconColor", displayName: "Icon colour", value: colour(D.iconColor) });
    name = "barColors";
    displayName = "Colours";
    slices: FormattingSettingsSlice[] = [this.accent, this.iconColor];
}

export class VisualFormattingSettingsModel extends formattingSettings.Model {
    public searchCard = new SearchCard();
    public optionsCard = new OptionsRowCard();
    public barCard = new SearchBarCard();
    public borderCard = new BorderCard();
    public textCard = new TextCard();
    public accentCard = new AccentCard();
    cards: FormattingSettingsCard[] = [this.searchCard, this.optionsCard, this.barCard, this.borderCard, this.textCard, this.accentCard];
}

type ColourSlice = InstanceType<typeof formattingSettings.ColorPicker>;
/** Where each colour lives: [object (card) name, property name, slice]. */
export function colourSlices(model: VisualFormattingSettingsModel): Record<ColourKey, [string, string, ColourSlice]> {
    return {
        background: ["searchBar", "background", model.barCard.background],
        borderColor: ["barBorder", "color", model.borderCard.color],
        focusColor: ["barBorder", "focusColor", model.borderCard.focusColor],
        textColor: ["barText", "color", model.textCard.color],
        secondaryColor: ["barText", "secondaryColor", model.textCard.secondaryColor],
        accent: ["barColors", "accent", model.accentCard.accent],
        iconColor: ["barColors", "iconColor", model.accentCard.iconColor],
    };
}

/** Colours the creator has not set take the report theme, both in the visual
 * and in the Format pane. A colour set by the creator is kept as is. */
export function applyThemeDefaults(model: VisualFormattingSettingsModel, objects: unknown, themeDefaults: Record<ColourKey, string>): void {
    const o = (objects && typeof objects === "object" ? objects : {}) as Record<string, Record<string, unknown> | undefined>;
    // Icons and the focus border follow the accent the creator chose, unless
    // they set those colours separately; otherwise everything follows the theme.
    const chosenAccent = o.barColors?.accent !== undefined ? normaliseColour(model.accentCard.accent.value?.value) : null;
    const defaults = chosenAccent ? { ...themeDefaults, iconColor: chosenAccent, focusColor: chosenAccent } : themeDefaults;
    for (const [key, [objectName, property, slice]] of Object.entries(colourSlices(model)) as [ColourKey, [string, string, ColourSlice]][]) {
        slice.defaultColor = { value: defaults[key] };
        if (o[objectName]?.[property] === undefined) slice.value = { value: defaults[key] };
    }
}

export function readCompactOptions(model: VisualFormattingSettingsModel): CompactOptions {
    const s = model.searchCard, r = model.optionsCard, b = model.barCard, br = model.borderCard, t = model.textCard, a = model.accentCard;
    const item = (slice: { value: unknown }) => (slice.value as { value?: unknown } | undefined)?.value;
    return compactOptions({
        mode: item(s.mode), logic: item(s.logic), ignoreAccents: s.ignoreAccents.value, autoSearch: s.autoSearch.value,
        placeholder: s.placeholder.value, showFieldNames: s.showFieldNames.value,
        layout: item(r.layout), showMatch: r.showMatch.value, showFields: r.showFields.value, showLogic: r.showLogic.value,
        showDate: r.showDate.value, showMore: r.showMore.value, showCount: r.showCount.value,
        barHeight: b.barHeight.value, radius: b.radius.value, background: b.background.value?.value, shadow: b.shadow.value,
        borderShow: br.show.value, borderColor: br.color.value?.value, borderWidth: br.width.value, focusColor: br.focusColor.value?.value,
        fontFamily: t.font.fontFamily.value, fontSize: t.font.fontSize.value, textColor: t.color.value?.value, secondaryColor: t.secondaryColor.value?.value,
        accent: a.accent.value?.value, iconColor: a.iconColor.value?.value,
    });
}
