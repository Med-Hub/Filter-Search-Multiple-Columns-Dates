> **Latest status — 31 October 2026:** the real Service ID is now configured and the full candidate build passed (608 tests, zero audit findings, 22 simulated browser checks). Real Desktop/Service and licence assignment testing are deferred. See [licensing configuration evidence](LICENSING_CONFIGURED_0.6.2.md). Earlier dated status below is historical.

# Filter & Search — Microsoft licensing integration (0.6.0)

## Status: integration/test build, not the AppSource submission

This update starts from Mohamed's uploaded Claude **0.5.4 source**, not an older FieldFind implementation. The agreed public name is **Filter & Search – Multiple Columns & Dates**, publisher Veilig Starten. The existing GUID is unchanged.

**The generated Microsoft Service ID has not been supplied.** `config/licensing.json` therefore contains an empty `servicePlanId`. The delivered test visual allows free searching but deliberately does **not** unlock date actions. It cannot be used to test an actual paid account until the real ID is configured and the package is rebuilt. No Service ID, purchase, subscription, trial, or customer licence was invented.

Use the test package in a **copy** of a report. Do not upload it to AppSource or replace a working shared production report with it.

## Feature boundary

| Free | Date Filter Pro |
|---|---|
| Simultaneous text and numeric search | Open and use the date-filter editor |
| Contains, Starts with, Exact; ANY/every enabled field | Specific date, Between, On or before, On or after, Blank |
| Case/accent handling and search as you type | Step through available dates and select them |
| Reader search preferences and author formatting | Apply a date condition alone or with a text query |
| Removing date conditions, clearing text, clearing all | Apply or refresh a query containing a date condition |

The 0.5.4 layout, stylesheet, reader options, theme behaviour and formatting cards are preserved. No popup, focus-mode workaround, custom checkout, payment form, backend or licence key input has been added. The public display name is updated; the package icon remains the baseline icon. Final logo/listing asset preparation is a separate release task.

## Implementation

`src/core/dateLicence.ts` contains an isolated entitlement state machine. `src/licensing/hostTransport.ts` calls the Power BI host's **native** `licenseManager`; it does not contact Microsoft directly or transmit report rows.

There is one asynchronous service-plan lookup per visual instance. Paid access requires all of these conditions:

1. A nonempty, configured generated Service ID.
2. A supported licensing environment.
3. Licence information successfully retrieved.
4. A plan whose `spIdentifier` exactly matches the configured ID.
5. That matching plan has **Active (1)** or **Warning (2)** status.

Other valid plans do not unlock Date Filter Pro. Inactive, Suspended and Unknown do not unlock it. Duplicate plan entries are accepted only when at least one entry for the correct Service ID is usable. Malformed responses fail closed for paid actions.

Lookup failures, offline/not-signed-in responses, unsupported hosts and a missing configuration are distinguished from a confirmed missing licence. Free search is not blocked by any of them. A 15-second timeout releases the pending lookup; a late response after timeout or disposal cannot enable paid access. Reopen/refresh the report to retry after a service failure or newly assigned licence; Power BI may cache licence responses for the session.

### Enforcement is not just a hidden Date button

The date action is checked in the component before opening the editor, again at `Visual.apply` and `Visual.retry`, and inside `SearchController.submit` before scanning/emitting. The existing queued-data refresh path goes back through the same gate. A direct call to the controller or applying a previously constructed date query does not bypass the check. Date catalogues are not exposed to the editor before entitlement is granted.

Normal field selection, text/numeric predicates and formatting are unchanged. Clearing the owned filter has no paid guard. Removing a date condition yields a free text-only query. No licensing response overwrites the input draft, selection or caret, or automatically applies a date that was clicked while the lookup was pending.

### Notifications

A requested paid action with a confirmed missing licence calls Microsoft's **`notifyFeatureBlocked()`**. No whole-visual blocking overlay is used. The native feature tooltip is translated for English, Dutch, French and Arabic, with English fallback and the 500-character limit respected. Notifications are throttled; an unsupported or failing notification cannot break free search.

Technical failures (pending lookup, missing configuration, unsupported environment or lookup failure) use the existing on-demand information mechanism, without a custom payment prompt. No report formatting property or local-storage flag grants paid access. Reader settings do not write shared report appearance.

## Configure the real plan

The friendly values `filter-search` and `date-filter-pro` in the configuration are the proposed Offer ID and Plan ID from the conversation. They are **not** the generated `spIdentifier`, and are not assumed to be confirmed Partner Center records.

Once Mohamed provides the generated Service ID, in the project root run:

```sh
node scripts/configure-licensing.mjs REAL_GENERATED_SERVICE_ID
npm run check:licensing
```

The script updates `config/licensing.json` and its generated `src/licensing/config.ts`. It does not open Partner Center or create a plan. Use the ID exactly as shown in Partner Center; it is not a password or API secret. Do not put the Offer ID or friendly Plan ID in this field.

For a normal release, increase the package/visual version **beyond the 0.6.0 test** while retaining the visual GUID. With the pinned dependencies installed:

```sh
npm ci
npm run package
```

`npm run package` now stops before packaging when the ID is missing, placeholder-like or inconsistent with generated source. `npm run package:offline` also runs this guard. The intentionally separate `package:sdk:test` and `package:offline:test` commands permit an **empty configuration only for testing**; they never grant a licence or insert a test ID.

A populated ID passes only the local configuration check, not proof that Microsoft recognises the offer/plan. Real private-plan testing is still mandatory before publication.

## Important inherited limitation: saved filters

0.5.4 saves an enumerated record-key filter, not full search/date provenance. On reopening, some existing filters are labelled **Saved filter · Clear**. This update does not reverse-engineer such a key list into a guessed query or entitlement.

An already stored report filter is **not silently deleted** just because a licence lookup is pending/unavailable or the new viewer has no paid licence. It remains clearable. New paid date actions and date-query reapplication require entitlement. A cached native filter, a visible date value or a report property never grants it.

This is a feature-action licence boundary, not row-level data security or a guarantee that prefiltered reports cannot be viewed. Do not advertise immediate revocation of cached host licences, retroactive removal of earlier saved filters or complete bookmark-restored date intent. If per-viewer access to already stored date-derived results must also be prohibited, establish that product policy and implement explicit versioned query provenance/migration before release; do not indiscriminately clear the user's report.

## Verification and provenance

See `docs/LICENSING_TEST_REPORT_0.6.0.md` for exact results and limitations. The original archive and SDK-built 0.5.4 package were kept unchanged. This environment could not resolve `registry.npmjs.org`, so this delivery is an **offline test rebuild**, not a new official SDK packaging run. All active application modules were compiled; only verified vendor factories from the uploaded SDK-built **0.5.4** package were reused. The new code is not injected as uncompiled source or substituted by test stubs.

An early local smoke test caught the obsolete offline vendor map lacking `FontControl`; it was replaced with the matching 0.5.4 vendor runtime before the final package was tested. The baseline browser suite's assumed reference date was fixed to 7 October 2026, and its theme check now waits for the existing CSS transition. These are test-fixture corrections, not UI changes.

The earlier general development-dependency audit concerns remain unresolved here. A fresh full SDK type-check/build, security audit, real Power BI Desktop/Service licensing test and Marketplace review are still required. The chosen small logo and matching offline sample report must also be finalised for the listing. This is not an AppSource-certified or submission-ready release.

## End-to-end acceptance after the ID is supplied

Test a private Microsoft-managed plan with separate assigned and unassigned users. Check that free searches work for both; every paid date condition works only for the assigned user; the native missing-feature message points to the actual offer; active trial/Warning status behaves correctly; clearing text/date/all remains safe; and unavailable/unsupported environments do not produce misleading purchase messages.

Repeat the tests in reading and editing views, after report refresh/reopen and after licence assignment/removal. Check a report with an existing saved key filter. The native licensing API is session-cached, so do not infer immediate revocation from a mock test. Verify the final renamed `.pbiviz` and the matching sample `.pbix` use the same version.

## Primary sources checked on 14 October 2026

- Microsoft licensing API, states, host caching, native notifications, limits and private-plan testing: https://learn.microsoft.com/en-us/power-bi/developer/visuals/licensing-api
- Microsoft custom visual licensing FAQ and refreshing after assignment: https://learn.microsoft.com/en-us/power-bi/developer/visuals/licensing-faq
- Microsoft's API enum/type declarations: https://raw.githubusercontent.com/microsoft/powerbi-visuals-api/main/src/visuals-api.d.ts

The implementation decisions and test results above are project work, not assertions of Microsoft's approval.
