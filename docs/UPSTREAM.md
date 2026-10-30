> **0.4.1 update:** See the current README.md and docs/qa/0.4.1/. Older statements below describe historical 0.3.0 work. The 0.4.1 artifact is an offline recompiled test package, not a new official SDK build.

# Upstream provenance

Inspected 6 October 2026. Foundation: **DataBrothers Text Search Slicer**, not Microsoft's standalone Text Filter.

Repository: https://github.com/databrotherscz/text-search-slicer  
Pinned commit: `a191450042040b84d8b15bca748930f4a66e66d7`  
Commit date: 25 August 2025. Licence: MIT, `Copyright (c) 2022 DataBrothers`.

## What was actually reused

| FieldFind file | Relationship to DataBrothers |
|---|---|
| `src/visual.ts` | Adapted React host lifecycle, formatting-service integration and context-menu setup. New data/segmentation/controller wiring; debug logging removed. |
| `src/components/TextSearchSlicer.tsx` | Adapted component and input/change/search/clear/key handler structure. Single target becomes selected-field chips; static global update callback removed; Scope 2 render tree replaces the original one-column UI. |
| `src/settings.ts` | Retains the formatting-card classes/property-construction approach; extends scope/match/appearance controls and changes design defaults. |
| `src/components/InputButtonIcons.tsx` | Reuses the actual upstream search/clear paths with accessibility attributes added. |
| `src/services/textSearchFilterService.ts` | Retains instance host, `general/filter` application and clear path. Replaces one-column `Contains` construction with the experimental key-filter adapter. |
| `capabilities.json`, `pbiviz.json`, package/config files | Adapted from the base; new identity, table mapping, key role, aligned API versions, pinned build dependencies and no unverified sync claim. |
| `src/core/*`, `src/powerbi/*`, tests and docs | New FieldFind code for the multi-column experiment. |

This is a source adaptation, not a byte-for-byte clone or an assertion that most code is unchanged. The source was read through the GitHub connector. A direct local `git clone` failed because this build environment could not resolve GitHub. No remote fork/repository/commit was created on Mohamed's account.

`upstream.lock.json` records original blob hashes. `npm run upstream:fetch` can retrieve a separately verified, build-relevant baseline into `upstream/full` on a connected development machine without replacing FieldFind. The downloader itself was syntax-checked but could not be network-tested here.

## Baseline discrepancy

At the same upstream commit, `package.json` declares Visual API `~5.4.0`, while `pbiviz.json` declares `5.10.0`. Both earlier statements about these numbers were based on different files. FieldFind intentionally aligns both to **5.4.0** for this experiment. The unchanged upstream baseline has **not** been successfully installed or packaged here; Phase 1's baseline build gate is still open.

Direct dependencies are pinned, but no new `package-lock.json` could be generated without registry access. An upstream lockfile would not be a valid FieldFind lockfile and was not relabelled as one. Generate and review the new lockfile on the first successful `npm install`; use `npm ci` afterward.

Tooling candidate: `powerbi-visuals-tools` **7.2.2**, verified as Microsoft's published GitHub release dated 23 September 2026. Its compatibility with this complete FieldFind project remains untested until installation/package build succeeds.

## Microsoft reference, not a second foundation

Reviewed `microsoft/PowerBI-visuals-TextFilter/src/visual.ts` for filter application, clearing, rendering events and accessible naming. The D3 visual was not cloned or merged. Microsoft's notices already present in DataBrothers' host/settings files are retained. We did not adopt the reference's Tab-loop behaviour.

References:
- https://github.com/microsoft/PowerBI-visuals-TextFilter
- https://github.com/microsoft/PowerBI-visuals-tools/releases/tag/7.2.2
- https://learn.microsoft.com/en-us/power-bi/developer/visuals/filter-api


## 0.2.0 continuation

The pinned DataBrothers foundation and FieldFind GUID are unchanged. No Microsoft's D3 codebase was cloned. New work is session/filter observation, stable scope reconciliation, host-reentry fixes, stricter input checks, browser regression tests and a local SDK build helper.

The preview-only React runtimes were obtained from preinstalled JupyterLab distributions, not from a successful npm install. `preview/vendor/PROVENANCE.json` records package identities and source chunk checksums. Only the seven needed webpack package module factories are repackaged for the offline harness. Full MIT notices are shipped and embedded in the standalone preview. Power BI host/formatting doubles live only under `preview/` and are never substituted into production source dependencies.

The original plan's baseline installation gate, upstream package build and real SDK dependency audit remain open.


## 0.3.0 continuation

DataBrothers remains the foundation at the same pinned commit. The visual GUID, required notices and original approved build plan are unchanged. This continuation added a new independent load coordinator, adapted the inherited visual/component lifecycle for resize and Retry, and improved local build diagnostics. Microsoft's standalone D3 Text Filter was not cloned. No upstream baseline package or dependency installation was successfully built here; those gates remain open.
