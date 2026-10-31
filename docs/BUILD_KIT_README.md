> **Latest status — 31 October 2026:** the real Service ID is now configured and the full candidate build passed (608 tests, zero audit findings, 22 simulated browser checks). Real Desktop/Service and licence assignment testing are deferred. See [licensing configuration evidence](LICENSING_CONFIGURED_0.6.2.md). Earlier dated status below is historical.

> **Current status — 31 October 2026:** see [validated 0.6.2 build repairs](BUILD_REPAIR_0.6.2.md). Older status statements below are historical. GitHub access is configured; source is present; installed checks and engineering packaging now pass. Release licensing and real-host validation remain outstanding.

# Filter & Search — certification work, revision 3

**15 October 2026. Source candidate 0.6.2. Not ready for submission.**

Read `TOOLCHAIN_0.6.2.md` for exact changes, package-registry provenance and remaining blockers. Read `GITHUB_SETUP.md` for the supplied repository destination and optional Git-bundle handoff.

## Current state

The API 5.11.1 dependency and targeted SockJS/UUID 11.1.1 override are resolved in a real npm-generated lockfile. This is NOT proof of installed API compatibility, a full audit, successful Microsoft lint or an SDK build. The braces security issue and real paid plan Service ID remain unresolved. Design, stylesheet, data roles and search behavior were not changed.

The last installable visual remains **0.6.1 Hardening Test**, with paid dates locked. No 0.6.2 binary is included or claimed built.

## Commands on a connected development machine

```sh
npm ci
npm run check:installed
npm run eslint
npm run typecheck
npm test
npm audit --include=dev --audit-level=moderate
```

For independent checks with logs, use `npm run check:connected`. It does not automatically fix dependencies or change the Service ID. It exits nonzero on failed/skipped release gates.

For explicit engineering compilation before the release gates can pass:

```sh
npm run package:sdk:test
```

This still requires installed compatibility, lint, typecheck and tests. Any output is named `Filter_Search_0.6.2_NOT_FOR_APPSOURCE_Test.pbiviz`. It is NOT a security clearance or certified output. The release command `npm run package` retains full security and licence checks and does not fall back to this path.

## Cloud workflow

Manual modes: **diagnose**, **sdk-test**, **release**. Use **resolve_api=false** for this version. No cloud run or remote push has happened in this session. Mode `sdk-test` keeps failed audit/licensing diagnostics visible while allowing a separate clearly labelled engineering compile. Release mode requires the frozen `certification` branch and all checks.

The prepared cloud workflow uses only the repository's source and public package downloads. It has read-only repository permissions, no secret inputs, no marketplace publication, and no user/employer report data.

## Local offline evidence

`npm run check:offline` records checks that can run here; it must not be treated as a complete release check. It deliberately reports missing SDK/lint/audit/licensing prerequisites. Strict core TypeScript compilation is not full application SDK typechecking.

The exact-package smoke runner can check an existing `.pbiviz` in a sandbox using a simulated host; it never rewrites the production Service ID. This is not a real Power BI report or paid purchase test. Use the full UI/licensing suites and real Desktop/Service test checklist for a future release candidate.

## Pending external inputs

The repository link is now known and recorded. The active connection lacks write access, so source has not been uploaded remotely. The actual generated Microsoft Service ID remains missing. Microsoft account/domain verification can proceed separately.

Synthetic test records and 19 expected-result scenarios are in `sample/release-kit`. They are not a finished `.pbix`; create the matching report in Power BI Desktop with the final submitted visual.

## Source export

`npm run export:certification -- NEW_DIRECTORY` produces a clean draft tree with the entire source inventory. Run `node scripts/verify-source.mjs` before installing/building to detect accidental missing files. Generated output, historical bundles, vendor factories, node_modules and logs are excluded. A clean export is not a certification award.
