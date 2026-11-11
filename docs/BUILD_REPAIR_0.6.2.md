> **Latest status — 31 October 2026:** the real Service ID is now configured and the full candidate build passed (608 tests, zero audit findings, 22 simulated browser checks). Real Desktop/Service and licence assignment testing are deferred. See [licensing configuration evidence](LICENSING_CONFIGURED_0.6.2.md). Earlier dated status below is historical.

# 0.6.2 build repair — 31 October 2026

Development/test candidate, **not Microsoft-certified or ready for AppSource**.

## Repairs

- Reconstructed the three hidden files missing from the original source inventory: the manual GitHub Actions workflow, `.gitignore`, and `.nvmrc`. Original bytes were unavailable; these are reviewed replacements, not a byte-identical recovery.
- Kept the pinned npm API package at 5.11.1. Microsoft's installed `powerbi-visuals-api/index.js` exports the host API as major.minor.0 (5.11.0). Corrected pbiviz.json, metadata checks, upgrade helper and installed checks accordingly. The artifact validator still requires exact agreement with the source manifest; no package labels are rewritten to bypass it.
- Updated compatible locked transitive dependencies: body-parser, fast-uri, follow-redirects, ip-address, qs and zod.
- Scoped the minimatch override to 10.2.6 -> 11.0.1, the patched version for GHSA-g3hv-75wg-m249. Verified the CommonJS Minimatch and minimatch calls resolved by the actual ESLint, config-array and TypeScript parser consumers, positive/negative/dot/brace patterns, full lint and SDK packaging. This is a reviewed major-version override; recheck it on future toolchain upgrades.
- Removed the stale block for withdrawn advisory GHSA-vfj7-8cjw-p6xm. Retained the earlier braces <3.0.3 vulnerability guard and the mandatory full live audit. The scoped SockJS/UUID fix is unchanged.
- No application source, design, capabilities, visual GUID, licensing configuration or paid feature behavior changed.

## Validation

Fresh npm ci, installed dependency probes, metadata, certification input precheck, TypeScript, ESLint, all 608 automated tests and official SDK engineering packaging pass. All 12 Chromium smoke checks passed against the exact final artifact. The full npm audit including development dependencies reports zero findings as of this run. See the accompanying validation evidence for exact counts and package hash.

The output is `Filter_Search_0.6.2_NOT_FOR_APPSOURCE_Test.pbiviz`. It is only an engineering test build. The release command still rejects the empty Service ID. Browser checks use a simulated host and cannot establish real Power BI or paid-plan behavior.

The restored workflow is manual, uses SHA-pinned actions, reads repository contents without persisted credentials, and uploads only build evidence plus the exact checksum-verified candidate. It never publishes to AppSource or changes repository files. Diagnostics failures keep the job red even when engineering packaging succeeds. Release mode requires the lowercase certification branch and all gates. The workflow has been validated locally but has not yet run on GitHub Actions.

## Remaining release work

1. Supply the real Microsoft licensing Service ID and rebuild with all release gates.
2. Test the exact final package in Power BI Desktop/Service, including real assigned/unassigned users, saved filters, exports and accessibility.
3. Prepare the matching offline sample PBIX and final listing/legal assets.
4. Freeze the reviewed certification branch at the final package source and submit for Microsoft review.

## Sources

- API version behavior: https://github.com/microsoft/powerbi-visuals-api/blob/v5.11.1/index.js (also inspected directly in the integrity-checked installed package).
- Withdrawn advisory: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- Retained braces advisory: https://github.com/advisories/GHSA-grv7-fg5c-xmjg
- Patched minimatch advisory: https://github.com/advisories/GHSA-g3hv-75wg-m249

Earlier dated Markdown sections are historical evidence and are superseded by this repair record and current validation results.
