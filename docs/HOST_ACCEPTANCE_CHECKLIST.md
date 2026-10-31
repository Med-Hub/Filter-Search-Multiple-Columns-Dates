> **Latest status — 31 October 2026:** the real Service ID is now configured and the full candidate build passed (608 tests, zero audit findings, 22 simulated browser checks). Real Desktop/Service and licence assignment testing are deferred. See [licensing configuration evidence](LICENSING_CONFIGURED_0.6.2.md). Earlier dated status below is historical.

# Final host acceptance — fill in observations, not assumptions

Product: Filter & Search – Multiple Columns & Dates. Publisher: Veilig Starten.
Candidate filename/hash: **not supplied yet**. Real paid-plan Service ID configured: **not supplied**.
All results below are **NOT RUN** in this session. Browser simulation and core test results do not fill these cells.

| Check | Desktop/version | Service/browser | Actual result/evidence |
|---|---|---|---|
| Import correct version without changing GUID; upgrade existing report | Not run | Not run | |
| Add/remove/reorder fields; all fields removed; invalid/missing key | Not run | Not run | |
| Same article with multiple delivery lines uses RecordKey, not ArticleNo | Not run | Not run | |
| Plain Date column versus hierarchy; valid search labels survive bad assignment | Not run | Not run | |
| Two-letter pause, continued typing, cursor, delete and zero-result state | Not run | Not run | |
| Synthetic cases C01–C19 in sample/release-kit/Expected_Results.json | Not run | Not run | |
| Change other slicers; narrow to broad; refresh recomputes eligible records | Not run | Not run | |
| Multiple instances; each clear leaves unrelated filters intact | Not run | Not run | |
| Author Format controls; corner radius/theme/high contrast; reader options | Not run | Not run | |
| Keyboard/touch, constrained sizes, zoom, page switching and focus | Not run | Not run | |
| Save/reopen/bookmarks explain active filters and documented limitations | Not run | Not run | |
| Exports/rendering-completion events; no console errors | Not run | Not run | |
| Row-level security roles do not reveal unauthorized dates/counts/records | Not run | Not run | |
| First data segment versus >20,000 rows; broad-match guard, responsiveness | Not run | Not run | |
| Unlicensed: free text/numeric search and Clear; no new paid date actions | Not run | Not run | |
| Real assigned Active/Warning plan unlocks dates; another plan does not | Not run | Not run | |
| Pending/offline/unsupported licensing clearly differs from not purchased | Not run | Not run | |
| Private-plan purchase/assignment, revocation/expiry and host cache refresh | Not run | Not run | |
| Microsoft prescribed sample test dataset plus public offline sample report | Not run | Not run | |
| Matching sample .pbix contains this exact final visual version | Not run | Not run | |

Also run Microsoft's full submission matrix, including conversion from/to standard chart types, combinations of field wells, property panes, pinning and performance. Applicability exceptions need a reason; do not mark everything passed because it is not a chart.

Source: https://learn.microsoft.com/en-us/power-bi/developer/visuals/submission-testing
Sample dataset reference from the certification page: https://github.com/PowerBi-Projects/PowerBI-visuals/tree/gh-pages/assets (linked by Microsoft; not retrieved/tested in this kit).
Public sample version/offline requirement: https://learn.microsoft.com/en-us/partner-center/marketplace-offers/power-bi-visual-technical-configuration

The final report should include a Hints/Setup page, licence disclosure and the unique-key example. Keep original employer/customer reports out of the public package. Current source has a deliberate Saved filter/Clear recovery path rather than full query-bookmark provenance; verify and disclose that limitation instead of claiming seamless restoration.
