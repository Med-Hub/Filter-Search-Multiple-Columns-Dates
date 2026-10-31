> **Latest status — 31 October 2026:** the real Service ID is now configured and the full candidate build passed (608 tests, zero audit findings, 22 simulated browser checks). Real Desktop/Service and licence assignment testing are deferred. See [licensing configuration evidence](docs/LICENSING_CONFIGURED_0.6.2.md). Earlier dated status below is historical.

> **Current status — 31 October 2026:** see [validated 0.6.2 build repairs](docs/BUILD_REPAIR_0.6.2.md). Older status statements below are historical. GitHub access is configured; source is present; installed checks and engineering packaging now pass. Release licensing and real-host validation remain outstanding.

# Source candidate 0.6.2 — not a release

Current work: [Toolchain changes and evidence](docs/TOOLCHAIN_0.6.2.md) · [Build commands](docs/BUILD_KIT_README.md) · [GitHub handoff](docs/GITHUB_SETUP.md).

No new `.pbiviz` was produced in this source-only pass. Earlier release notes below are historical; current blockers and version status are in the linked documents.

---

# Certification preparation — revision 2

Product/runtime version remains **0.6.1**. No new .pbiviz was created for this preparation pass. All application source, CSS, capabilities, licence configuration, icon and dependency versions are unchanged. Added: manual cloud diagnostics/release workflow, stronger build checks, exact-result synthetic fixtures, SDK-bundle smoke runner, and a host-validation checklist.

Read **docs/BUILD_KIT_README.md** first. Current API/security/licensing blockers remain; do not submit the previous test package.

---

# Filter & Search — Multiple Columns & Dates

**Version 0.6.1 — certification-hardening work in progress. Not for AppSource submission yet.**

Publisher: Veilig Starten. Owner: Mohamed Mohsine. Based on DataBrothers Text Search Slicer with Microsoft Text Filter as a reference. Existing visual GUID and report property contracts are retained.

Free text/numeric multi-column search; Date Filter Pro uses Microsoft's native per-user licensing. The Service ID is deliberately empty until the real Partner Center plan ID is provided. This is a development source folder, not an already-certified visual.

Read `docs/HARDENING_0.6.1.md` for what changed, what is verified and what remains blocked. Read `docs/CERTIFICATION_NEXT_STEPS.md` before attempting a submission.

## Build commands after the documented prerequisites are resolved

```sh
npm run upgrade:api
npm ci
npm run eslint
npm run typecheck
npm test
npm run check:security
npm audit
npm run configure:licensing -- YOUR_ACTUAL_SERVICE_ID
npm run package
```

The full release pipeline stops on missing Service ID, the older API and the known dependency issues. Do not bypass those checks. The separately supplied hardening test `.pbiviz` is an offline application rebuild, not a successful run of this SDK command.

Appearance and search logic are unchanged in this revision. The same-table unique key, data-completeness and payload guards remain. No telemetry, external runtime request or new privilege was added.

## Reviewable source

`src/` contains only the current visual. `tests/` contains core/configuration/security fixtures. `scripts/` contains build/verification tooling, not runtime code. `sample/` contains synthetic data/Power Query fixtures, not an approved sample `.pbix`. `upstream/MICROSOFT_NOTICE.txt` and `LICENCE` retain required source notices.

The clean review export excludes dist/node_modules/.tmp and historical/minified vendor trees. Do not confuse that export with a created or frozen GitHub certification branch; none has been created automatically.
