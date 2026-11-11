# Date Filter Pro licensing configuration — 31 October 2026

The owner supplied a Partner Center screenshot for offer **Filter & Search**, plan **Date Filter Pro**, showing the generated Service ID:

`bb7a616c-775c-4bd6-9907-a16c1d9b5e8d.filter-search.date-filter-pro`

The screenshot shows **Public** availability and **Draft** status. This work changed no Partner Center settings, published no offer, and purchased or assigned no licences.

## Completed

The existing configure-licensing command wrote the exact Service ID to config/licensing.json and generated src/licensing/config.ts. The configuration consistency test now validates the configured identifier. Missing/placeholder ID rejection and entitlement state-machine tests remain intact. All other application source, design, capabilities and visual identity are unchanged.

The full npm run package pipeline passed: licensing, metadata, installed dependencies, certification precheck, ESLint, TypeScript, all **608 tests**, a full dependency audit with **zero vulnerabilities**, Microsoft SDK packaging and exact artifact validation. The output is a candidate, **not a certified or submission-ready release**.

All **22 Chromium smoke checks** passed against that exact package. Both unlicensed and simulated assigned-plan users retain free search/clear; unlicensed date actions stay blocked; the matching simulated plan opens and applies date filtering. No runtime errors or direct application network requests were observed. The production package code and embedded Service ID were not rewritten by the harness.

## Deferred validation

Real licence purchase/assignment, Microsoft recognition of the plan, and Power BI Desktop/Service testing have **not** been performed. The owner chose to do host testing later. A configured identifier alone does not grant a licence or publish the draft plan.

Later: validate the final package with assigned and unassigned users, report reopen/bookmarks, exports, multiple instances and sample data. Complete the matching sample PBIX, listing assets and certification freeze before submission. Consult docs/HOST_ACCEPTANCE_CHECKLIST.md.
