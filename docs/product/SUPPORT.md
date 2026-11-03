# Filter & Search support

Published preparation documentation for the 1.0.1 candidate. Power BI Desktop/Service validation is still pending; this is not a Microsoft certification claim.

Filter & Search – Multiple Columns & Dates helps you find records across several columns in Power BI. Text and numeric search are free. Date filtering requires a Date Filter Pro license assigned to the signed-in user.

## Set up your visual

1. Add the visual to your report.
2. Put a unique record identifier in **Record key (prototype)**. Each row must have its own key. If an article appears in several deliveries, use the delivery record key rather than the repeated article number.
3. Add text or numeric columns to **Search fields**. Use fields from the same table as your record key.
4. Add ordinary Date or Date/Time columns to **Date fields (optional)**. Select the column rather than its Year/Quarter/Month/Day hierarchy.
5. Enter a query and select Contains, Starts with or Exact. Choose whether to match any selected field or every selected field on the same record.

Store codes as text when leading zeros matter. For example, a numeric column cannot preserve the difference between 00123 and 123.

## Date Filter Pro

Date Filter Pro adds on-a-day, between-dates, on-or-before, on-or-after and blank-date conditions. You can combine a date condition with a text search on the same record.

Installing the visual does not assign a subscription. Your administrator must assign the appropriate Date Filter Pro license to your Microsoft account. Confirm that Power BI is signed in with that account. After assignment changes, start a new Power BI session before testing again.

If license information is temporarily unavailable, check your sign-in and connection. An unavailable license response is different from a confirmed absence of a license. Text and numeric search remain free.

## Common questions

**Why does the visual ask for a unique key?**

It applies filters to records. Duplicate keys can identify several different rows, so use a stable key that identifies one record.

**Why does my date column not work?**

Check that it is a Date or Date/Time column, comes from the same table, and is not an automatic hierarchy. Date actions also require an assigned Date Filter Pro license.

**Why am I asked to narrow my search?**

The current visual allows up to 10 search fields, 5 date fields, 100,000 candidate records and 5,000 matching records, with additional text-size and filter-size safeguards. A broad or oversized query can be rejected while the previous valid filter remains active. Use more specific search text or other report slicers.

**What happens after saving or restoring a bookmark?**

A report can retain a filter without restoring all of the original search text and options. Use the visual's **Saved filter / Clear** recovery when shown. Full restoration of the original query from a bookmark is not promised.

**Does Clear reset every report filter?**

Clear removes the filter owned by that visual. Other report slicers and filters should remain applied.

## Contact support

Email **mmohsine@veiligstarten.nl** with the subject **Filter & Search support**. Include the visual version, Power BI Desktop or browser version, a short description and the steps that reproduce the issue. For licensing issues, describe whether the account is assigned a Date Filter Pro license.

Use a small synthetic example when sharing a report or screenshot. Remove personal, customer and employer information. Never send passwords, verification codes, access tokens or payment-card details.

See the [product privacy notice](PRIVACY.md) for support-data handling and its account-verification status. Customer subscription terms are described in [Licensing and terms](TERMS.md).

## Contact and availability

Product support is provided by Veilig Starten, Groenewoudseweg 173, 5621 BG Eindhoven, Netherlands, at **mmohsine@veiligstarten.nl**. The owner handles requests. Support covers installation, field setup, product faults and Date Filter Pro licence troubleshooting. There is no guaranteed response or resolution time. Power BI platform outages, your report model and your organisation’s permissions may require assistance from Microsoft or your administrator.

Please provide the visual version, Desktop or browser version, the steps that reproduce the issue, expected and actual behaviour, and a synthetic example when possible. Do not send passwords, authentication codes, payment information or confidential datasets.
