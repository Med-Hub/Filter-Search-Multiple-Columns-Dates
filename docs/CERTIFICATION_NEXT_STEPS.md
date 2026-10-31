> **Current status — 31 October 2026:** see [validated 0.6.2 build repairs](BUILD_REPAIR_0.6.2.md). Older status statements below are historical. GitHub access is configured; source is present; installed checks and engineering packaging now pass. Release licensing and real-host validation remain outstanding.

> **Update 15 October 2026:** use [TOOLCHAIN_0.6.2.md](TOOLCHAIN_0.6.2.md) and [BUILD_KIT_README.md](BUILD_KIT_README.md) for current status. API/UUID lock resolution has progressed, but installed validation and braces remediation are still blocked. Earlier instructions below are historical.

# Remaining release sequence

The order below deliberately does not ask you to upload the test package.

1. On a connected development machine, inspect `config/toolchain-targets.json` against current npm releases. Run `npm run upgrade:api`. It resolves the new package/lock in a temporary directory and only updates the real manifests on success; backups are retained.
2. Resolve the actual full dependency audit, including development packages. Do not use `npm audit fix --force`, suppress the braces advisory or override UUID's major version without compatibility tests. The present braces advisory has no published patched release; raise the specific SDK dependency-chain problem with the maintainer/Microsoft when a supported fix is unavailable.
3. Run `npm ci`, `npm run eslint`, `npm run typecheck`, `npm test`, `npm run check:security`, and a full `npm audit`. These are release gates, not optional documentation. Inspect any new findings and retain command exit codes/logs.
4. Configure the real Date Filter Pro Service ID using the existing `configure:licensing` command. This is the generated service identifier, not `filter-search` or `date-filter-pro`. Never commit a synthetic test ID as the production value.
5. Run `npm run package`. It invokes the Microsoft SDK, includes its certification audit, and applies the explicit vendor-only DOM hardening transform. The SDK report records the final transformed filename/checksum. Only that final file is a candidate; the raw SDK intermediate is not the intended release artifact.
6. Rerun browser tests against that exact SDK output, then test Desktop/Service, purchase/assignment and unlicensed access, exports, field changes, report refreshes, multiple instances, and the public sample report. Do not mark simulated licensing as real licence validation. Use Microsoft's specified sample test dataset in addition to synthetic cases.
7. Build a public offline `.pbix` containing the matching visual and synthetic records, including the unique-record-key example. Finalise the selected third icon/name, screenshots and support/privacy/EULA pages.
8. Export a clean source folder with `node scripts/export-certification.mjs /path/to/review-folder`. Place ONLY that source folder in the review repository. Create/freeze lowercase branch `certification` at the exact release commit when it really matches the final package. Do not put node_modules, .tmp, dist, offline vendor factories, historical applications or credentials in the branch. Keep reviewer access separate from source code and this chat.
9. Submit the final offer/certification request. Microsoft reviews the code and decides approval; local checks do not grant the badge.

## Manual evidence record (fill with actual observations)

| Check | Host/version | Exact package SHA-256 | Result | Evidence |
|---|---|---|---|---|
| Desktop import/upgrade, valid/invalid fields | Not yet run | | | |
| Live two-letter search, cursor, broaden-after-narrow | Not yet run | | | |
| Numeric/text OR/ALL, accents, blanks, multiple instances | Not yet run | | | |
| Dates and key grain, date hierarchy mistakes | Not yet run | | | |
| Licensed and unlicensed users, private plan assignment | Not yet run | | | |
| Offline/unsupported licence environment and clear/reset | Not yet run | | | |
| Save/reopen/bookmark behaviour and documented limitations | Not yet run | | | |
| Rendering completion, exports and no browser-console errors | Not yet run | | | |
| Service reader/edit mode, security roles and relationships | Not yet run | | | |
| Microsoft's sample dataset and matching offline sample .pbix | Not yet run | | | |

## Preparation revision 2

See BUILD_KIT_README.md for the new manual cloud workflow, exact-result sample and independent diagnostics collector. These were prepared locally; the workflow has not run remotely.
