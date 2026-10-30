# Filter & Search 0.6.1 — certification hardening

**State: development/test build, NOT ready for certification or AppSource submission.**

## Implemented without redesign

- A per-update rendering lifecycle delivers exactly one success/failure completion. Success waits for the DOM commit callback. A real rendering exception does not trigger another attempt to render the same failing tree. Pending frames fail on disposal or a 15-second deadline. Host completion callback exceptions do not cause double reporting. Unexpected Format-pane errors return an empty model rather than throw.
- A source AST security check rejects direct network/dynamic execution calls, raw HTML insertion and string-valued timers. This is additional screening, not a replacement for Microsoft's linter or a security proof.
- An explicit, repeatable build-time transform disables the three raw-HTML assignments in the reused React DOM runtime. They are replaced with a fixed exception, not renamed, hidden, or treated as an HTML sanitizer. The application does not use these raw-HTML features. JSX text, inputs, SVG icons and date/search interactions are covered by the regression suite. The same transform is wired into the future SDK packaging command.
- Added `eslint.config.mjs`, Microsoft's recommended runtime rules, and the required `eslint` command. ESLint, the Microsoft plugin, the TypeScript parser, globals and JSZip are direct exact-pinned development dependencies promoted from entries already present in the supplied lockfile. Existing transitive versions/integrity hashes were preserved. Actual ESLint execution remains blocked by unavailable dependencies.
- Added a registry-backed transactional API-upgrade helper, a conservative certification precheck, and a source exporter that excludes generated/legacy/minified application trees. No remote repository or certification branch was created.
- The normal release command now fails rather than bypassing missing licensing, an outdated API, known dependency findings, lint/typecheck/test failures, or a failed full audit. Offline test packaging remains explicitly separate from the release path.

## Deliberately unchanged

The tested Claude 0.5.4 layout, 0.6.0 licensing behaviour, current property contracts, styling, icon, stable visual GUID and search/date algorithms are retained. The component's release marker changes to 0.6.1 only. There is no redesign, new paywall, external service, focus mode, hierarchy reconstruction, new date interpretation, or automatic filter reset.

## Still open — not fixed by a green unit-test result

1. The checked-in API is still **5.4.0**, not the reviewed target **5.11.1**. `upgrade:api` was attempted; npm DNS resolution failed. It left package.json, package-lock.json and pbiviz.json unchanged. Pinning a new API while fabricating its lockfile integrity was deliberately avoided. Run the helper on a connected build machine, install and fully type-check/test the migration.
2. The lock still includes **braces 3.0.3** and **uuid 8.3.2**. The reviewed braces advisory has no published patched version. Do not hide this with `--omit=dev`, a package rename, a blind major-version override, or an obsolete SDK downgrade. The full dependency tree requires a compatible upstream fix or a reviewed replacement. A local mitigation alone is not a clean npm audit.
3. The complete project ESLint run, installed-SDK application typecheck, fresh official SDK packaging/audit and full npm audit could not run here. Only the core is strictly type-checked. The declared SDK pipeline is prepared but not represented as successfully executed.
4. The Service ID is still empty. The supplied .pbiviz keeps date actions locked and text/numeric searching free. Configured licensing paths were tested in an HTML-only fixture, not a customer package or a real Microsoft purchase.
5. The clean source export is not a frozen `certification` Git branch. Reviewer access, the matching sample .pbix, Microsoft's test-dataset evidence, full Desktop/Service tests and final listing/logo/legal assets remain release work. The old provisional small package icon is unchanged.

## Build provenance

The delivered test .pbiviz was compiled offline with TypeScript 5.8.3 using only verified vendor runtime modules from the user's SDK-built 0.5.4 package, then passed through the documented raw-HTML transform. It is not the output of a new Microsoft SDK run. The source pins TypeScript 5.9.3 for the future reproducible installed build. `dist/BUILD_REPORT.json` records application and output hashes plus transform locations.

The clean source folder excludes those offline vendor factories. Reviewers should rebuild using public npm dependencies and `npm run package` after every blocker has been resolved. The resulting future SDK package must be the one actually submitted; do not submit this offline test file as though its checksum were reproduced by that future command.

## References rechecked on 14 October 2026

- Certification: https://learn.microsoft.com/en-us/power-bi/developer/visuals/power-bi-custom-visuals-certified
- Rendering events: https://learn.microsoft.com/en-us/power-bi/developer/visuals/event-service
- Microsoft ESLint configuration: https://www.npmjs.com/package/eslint-plugin-powerbi-visuals
- API target: https://www.npmjs.com/package/powerbi-visuals-api
- Tools target: https://www.npmjs.com/package/powerbi-visuals-tools
- Braces advisory: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- UUID advisory: https://github.com/advisories/GHSA-w5hq-g745-h8pq
- Licensing: https://learn.microsoft.com/en-us/power-bi/developer/visuals/licensing-api

Only Microsoft can award certification. None of the local checks is a certification approval.
