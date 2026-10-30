# 0.6.2 — source/toolchain candidate, 15 October 2026

**Not an installable release, not certified.** No 0.6.2 `.pbiviz` was built. The last delivered binary remains the unconfigured 0.6.1 hardening test. Do not modify that binary's version or API label to pretend it is a new SDK build.

## Actual changes

- `powerbi-visuals-api` 5.4.0 → **5.11.1** in package.json, the npm-generated package-lock.json and pbiviz.json. This completes dependency/configuration resolution; installed SDK compatibility is still unverified.
- A scoped override, **`sockjs@0.3.24 -> uuid@11.1.1`**, replaces the vulnerable UUID 8.3.2 lock entry. No blanket UUID upgrade is used. No older nested UUID remains in this lock.
- The repo URL is recorded as `https://github.com/Med-Hub/Filter-Search-Multiple-Columns-Dates`. GUID, licensing identifier, icon, styles, data-role capabilities and runtime search behavior remain unchanged. Only the application release-label constant changed to 0.6.2.
- New installed-tree probe checks all exact direct versions, actual API files, and the UUID resolved by the actual SDK → dev-server → SockJS dependency chain. It exercises CommonJS `v4()` and server construction without listening on a port. It requires real installed packages; it cannot pass from the lock alone or from global substitutes.
- New final-artifact checks compare outer/inner version, GUID, API, publisher, capabilities, icon, embedded resource path and nonempty JS/CSS against source. They reject external scripts or privileges. SDK reports now include application/input hashes.
- A separate, explicitly chosen `sdk-test` workflow mode can expose real compiler/linter errors before a Service ID/security fix exists. Its output is named **NOT_FOR_APPSOURCE_Test**. The full audit is still collected; unresolved diagnostics keep the job red. The release path continues to require every gate and never switches into test mode.
- Fixed the clean-source exporter so `CERTIFICATION_STATUS.md` is included in the hash inventory. `verify-source.mjs` detects missing, changed and unlisted files before installation.

## Registry provenance — no invented integrity hashes

Direct downloads and the audit endpoint still fail DNS resolution in the working container. An external retrieval tool obtained the official npm version manifests live:

- https://registry.npmjs.org/powerbi-visuals-api/5.11.1 — scrape ID `01a13f50-c3ea-77df-bfeb-d562179c35a2`.
- https://registry.npmjs.org/uuid/11.1.1 — scrape ID `01a13f51-a4f5-74d9-bbc2-d0556b02c412`.

Only the relevant package-manifest fields were retained in an isolated npm metadata cache. **npm 10.9.2** then ran:

```sh
npm install --offline --package-lock-only --ignore-scripts --no-audit --no-fund --cache=ISOLATED_METADATA_CACHE
```

That command exited successfully and generated the lock. No package archive was downloaded, installed, rebuilt or fabricated. The tarball URLs and SHA-512 integrity values come from the official manifests. Normal `npm ci` will download and integrity-check those tarballs on the connected machine. The private metadata cache is not shipped in the source and is not used by the normal build.

Only API and UUID package versions/integrity values changed. npm also removed redundant peer flags on existing direct-dev dependency entries; their versions and integrity values were unchanged. The diff is retained in the evidence bundle.

## Why this UUID override is a reasonable candidate, not yet an installed compatibility pass

The published SockJS 0.3.24 registry manifest points to commit `a01674d8bd1e10550bec397a27ba01643dd5ac73`. Its `src/transport.coffee` uses `require('uuid').v4()` with no arguments. The UUID 11.1.1 manifest retains a CommonJS export and v4 API. The new runtime probe tests this precise dependency resolution after installation.

References:
- https://github.com/sockjs/sockjs-node/blob/a01674d8bd1e10550bec397a27ba01643dd5ac73/src/transport.coffee
- https://registry.npmjs.org/sockjs/0.3.24
- https://registry.npmjs.org/uuid/11.1.1
- https://github.com/advisories/GHSA-w5hq-g745-h8pq

The reviewed UUID advisory marks 11.1.1 patched. This is NOT a claim that the whole dependency tree has a clean audit. A scoped major override still needs installed-tree, SDK and developer-server testing.

## Still blocked

1. **braces 3.0.3:** the reviewed high-severity advisory lists no patched release. Its dependency chain is unchanged and the preflight explicitly fails. No advisory is suppressed; no dev dependencies are omitted from a release audit. https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
2. **Full installed checks:** npm ci, exact compiler/API typecheck, actual Microsoft ESLint run, installed SockJS/UUID probe, full live security audit and final SDK package remain unperformed here.
3. **Missing Service ID:** `config/licensing.json` is still empty. Free search/clear remain the intended free functions; dates are not unlocked by this source preparation.
4. **Real hosts:** Power BI Desktop/Service, actual private-plan assignment, export, persistence and matching sample PBIX remain outstanding.
5. **Repository:** it was rechecked empty/read-only from the active GitHub connection. No push, workflow execution, remote branch, marketplace submission or account change occurred.

Microsoft alone awards certification. https://learn.microsoft.com/en-us/power-bi/developer/visuals/power-bi-custom-visuals-certified

## Additional virtual-lock verification

npm's actual Arborist loader resolved **518 virtual package nodes** with no invalid required dependency edges. SockJS resolves to overridden UUID 11.1.1 with a valid edge. The direct API resolves to 5.11.1. The unchanged formatting utility retains its own nested API 5.1.0 declaration dependency; no blanket API override was applied. This check validates the lock graph, not tarball installation or full TypeScript compatibility.

The first graph assertion incorrectly assumed only one API copy would exist; it was corrected to check the project's direct API and report all nested copies. This was a test assumption, not another package change.
