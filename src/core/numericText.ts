import { SearchError } from "./types";

/** Search representation of an underlying numeric value; no model mutation,
 * locale separators, currency symbols or invented zero-padding. Use Text in
 * the model for identifiers with meaningful leading zeros or >15/16 digits.
 */
export function numericSearchText(value: number): string {
    if (!Number.isFinite(value)) throw new SearchError("numeric-value", "Search columns must contain finite numeric values.");
    if (Number.isInteger(value) && !Number.isSafeInteger(value)) {
        throw new SearchError("numeric-precision", "A numeric identifier exceeds safe integer precision. Store long identifiers as Text in the model.");
    }
    if (Object.is(value, -0)) return "0";
    const raw = String(value);
    if (!/[eE]/.test(raw)) return raw;
    // Avoid scientific notation in identifiers/small decimal searches.
    const sign = raw[0] === "-" ? "-" : "";
    const [coefficient, exponentText] = raw.replace(/^-/, "").toLowerCase().split("e");
    const dot = coefficient.indexOf(".");
    const digits = coefficient.replace(".", "");
    const point = (dot < 0 ? coefficient.length : dot) + Number(exponentText);
    if (point <= 0) return sign + "0." + "0".repeat(-point) + digits;
    if (point >= digits.length) return sign + digits + "0".repeat(point - digits.length);
    return sign + digits.slice(0, point) + "." + digits.slice(point);
}
