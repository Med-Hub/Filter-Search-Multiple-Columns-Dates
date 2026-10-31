# Remaining release sequence — configured 0.6.2

The real Service ID, dependency/API repair and automated build gates have been completed in the recorded candidate. Do not repeat initial account setup, reconfigure the ID or upgrade dependencies without a separate reason. The offer remains unpublished and actual Power BI host/license acceptance is pending.

1. Complete the store description, approved 300 × 300 Marketplace logo, product support/privacy pages and reviewed EULA/contract choice. Preserve upstream license notices. Confirm the final display name and monitored support contact.
2. Prepare the new offer's private licensing test arrangement with a test tenant and user. A configured ID is not an assigned license. Do not mark simulated responses as real entitlement validation.
3. Build the exact candidate with `npm ci` and `npm run package`, retain its final SDK report, and run `python3 scripts/test-release-smoke.py`. Every changed package needs its own evidence.
4. Run Desktop/Service, assigned/unassigned license, RLS, exports, field changes, refresh, multiple-instance and bookmark checks. Use Microsoft's prescribed sample dataset alongside the 19 synthetic scenarios. Fill `HOST_ACCEPTANCE_CHECKLIST.md` with observations and exact package hashes.
5. Create a public offline `.pbix` containing the same visual version and synthetic data, with a final Hints/Setup page and license disclosure. Capture accurate store screenshots from the validated host experience.
6. Export clean source with `node scripts/export-certification.mjs NEW_DIRECTORY`. Freeze a lowercase `certification` branch at the source corresponding to the final package only after validation and review. Exclude generated dependencies, credentials and private reports.
7. Review the final offer and submission evidence with the owner. Public publication and certification submission are separate actions; Microsoft decides certification approval.

References: [licensing test process](https://learn.microsoft.com/en-us/power-bi/developer/visuals/licensing-api#test-a-licensed-visual), [sample package requirements](https://learn.microsoft.com/en-us/partner-center/marketplace-offers/power-bi-visual-technical-configuration).

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
