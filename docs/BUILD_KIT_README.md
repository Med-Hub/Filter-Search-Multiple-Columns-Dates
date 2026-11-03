# Build kit — configured 1.0.1 candidate

The real Date Filter Pro Service ID is configured. API package 5.11.1 exports host API 5.11.0, which the manifest and installed checks use. Dependencies are locked and compatibility/security checks passed in the recorded build. This does not guarantee future audit results or real-host acceptance.

## Local validation

On a clean checkout, run `node scripts/verify-source.mjs` before installing or generating files. Use the Node version in `.nvmrc`.

```sh
npm ci
npm run check:installed
npm run package
```

`npm run package` checks licensing configuration, metadata, installed compatibility, certification precheck, lint, typechecking, tests and full audit before SDK packaging. The final package and SHA-256 are recorded in `dist/SDK_BUILD_REPORT.json`. Use that exact final file, not an SDK intermediate.

For an independent logged check, run `npm run check:connected`. It performs a fresh locked install and keeps failed checks visible. `check:offline` is incomplete evidence and deliberately exits nonzero.

## Exact-package browser smoke

Install the test dependencies and browser in your Python environment:

```sh
python3 -m pip install playwright==1.64.1
python3 -m playwright install chromium
python3 scripts/test-release-smoke.py
```

An explicit package path may be supplied. The runner keeps packaged application code intact, simulates the host and assigned/unassigned license responses, and saves evidence under `build-logs/package-smoke`. This is not Desktop, Service or real license-assignment validation.

## GitHub checks

Pull requests to main automatically run diagnostics, `package:sdk:test`, exact-package Chromium smoke and verified artifact upload. Failed diagnostics prevent packaging. The artifact is marked `NOT-FOR-APPSOURCE-sdk-test` and is not a release submission.

Manual modes remain `diagnose`, `sdk-test`, and `release`. Keep `resolve_api=false` for this reviewed version. Release mode additionally requires the exact lowercase `certification` branch. The workflow has read-only repository permissions and does not publish offers or grant licenses. [Verified run 41242898447](https://github.com/Med-Hub/Filter-Search-Multiple-Columns-Dates/actions/runs/41242898447) passed; inspect later runs for subsequent changes.

## Source and host handoff

`npm run export:certification -- NEW_DIRECTORY` produces a clean source export with a complete checksum inventory. Exports exclude dependencies, build output and logs. A clean export is not a certification award or a frozen branch.

Use `sample/release-kit` and `HOST_ACCEPTANCE_CHECKLIST.md` for actual host testing. The matching offline sample PBIX, listing assets and final release review are still outstanding.
