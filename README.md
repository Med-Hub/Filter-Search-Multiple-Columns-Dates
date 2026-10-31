# Filter & Search – Multiple Columns & Dates

Version **0.6.2** (visual 0.6.2.0). Publisher: Veilig Starten.

Free multi-column text/numeric search with Microsoft-licensed Date Filter Pro. The real Service ID is configured. The product remains a **candidate awaiting Power BI Desktop/Service and real-license acceptance**, not a Microsoft-certified release.

## Current validation

The full configured candidate was built locally. GitHub engineering validation [run 41242898447](https://github.com/Med-Hub/Filter-Search-Multiple-Columns-Dates/actions/runs/41242898447) passed at commit `33bf297ef2162df8565db1471183a8884f8c849b`: fresh installation, source inventory, lint, typechecking, 608 tests, full audit with zero vulnerabilities, SDK packaging and 22 simulated browser checks. Later metadata/documentation changes require their own current build evidence; inspect the latest PR checks.

[Draft PR #1](https://github.com/Med-Hub/Filter-Search-Multiple-Columns-Dates/pull/1) remains open and unmerged. No Marketplace offer or certification submission has been published by this preparation work.

## Build and test

Use the Node version in `.nvmrc` and the locked dependencies. On a clean source checkout, verify the inventory before installing:

```sh
node scripts/verify-source.mjs
npm ci
npm run package
python3 scripts/test-release-smoke.py
```

The smoke runner needs Python Playwright and its Chromium browser. It simulates Power BI and licensing; it does not validate a real Microsoft entitlement. See [build instructions](docs/BUILD_KIT_README.md).

Use `npm run check:connected` for independent checks and retained logs. GitHub pull requests build a marked engineering package; manual release mode is reserved for a frozen `certification` branch. Do not run `upgrade:api` or change the Service ID as routine setup: reviewed versions and the real ID are already configured.

## Set up a report

Use a unique RecordKey and fields from the same table. A repeated article number is not a unique key when an article has multiple delivery records. Add plain Date/DateTime columns rather than date hierarchies. Text/numeric search is free; date actions require an assigned Date Filter Pro license for the signed-in user.

The [synthetic sample](sample/release-kit/README.md) includes 12 records and 19 expected-result scenarios. Create and test the matching offline sample PBIX in Desktop. Complete the [host acceptance checklist](docs/HOST_ACCEPTANCE_CHECKLIST.md), including Service, real licensing, RLS, bookmarks, exports and large datasets. Saved filters have a Clear recovery path; full query restoration from bookmarks is not promised.

## Remaining release work

Complete product support/privacy/EULA and listing media, real-host testing, the matching sample PBIX, then freeze the exact reviewed source and follow the [release sequence](docs/CERTIFICATION_NEXT_STEPS.md). Configuring a Service ID does not assign a license.

[Licensing evidence](docs/LICENSING_CONFIGURED_0.6.2.md) · [Build repair history](docs/BUILD_REPAIR_0.6.2.md) · [GitHub workflow](docs/GITHUB_SETUP.md).

## Source notices

Based on DataBrothers Text Search Slicer, with Microsoft Text Filter as a reference. Retain `LICENCE`, `THIRD_PARTY_NOTICES.md` and `upstream/MICROSOFT_NOTICE.txt`. Source licensing notices are separate from the Marketplace product subscription terms.
