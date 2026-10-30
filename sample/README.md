# Offline sample for the Power BI proof

All values are synthetic. This is not an IKEA dataset or Mohamed's report.

Prefer **Create_Synthetic_Articles.pq**: in Power BI Desktop, create a Blank Query, open Advanced Editor, paste that file, name the query **Articles**, then Close & Apply. Its explicit text types preserve leading zeros in article identifiers. Alternatively import `synthetic-data.csv`, disable/remove automatic numeric conversion for Article number and set the search columns to Text.

After an actual SDK package has been built:

1. Import the `.pbiviz` through the Visualizations pane's “Import a visual from a file” action. A tenant restriction may block unapproved custom visuals; do not bypass organisational controls.
2. Add FieldFind. Put **Record ID** into **Record key (prototype)**. Put **Article number**, **Article name**, **Supplier**, **HFB** into **Search fields**. Use the same table for all roles.
3. Add a separate table with the article fields. Add a separate card for `SUM(Articles[Available pieces])`.
4. Search **billy** in ANY/Contains. Expected record IDs: **1, 2, 3, 4**; available pieces: **392**. Row 3 matches Supplier only, proving the intended cross-column OR semantics.
5. Disable Supplier and apply. Expected IDs: **1, 2, 4**; pieces: **347**.
6. Clear; all 12 synthetic records should return. Search a nonexistent phrase; the other visuals should show no matching records, not all records.
7. Search **oak**, then broaden to **billy**. Confirm all four matches return, or capture the explicit Clear/reload guard if the host narrows the candidate data.
8. Add an HFB slicer. Test changes while a query is active, two FieldFind instances, save/reopen and bookmarks. Record actual behaviour in `docs/HOST_TEST_CHECKLIST.md` rather than marking checks passed from assumption.

No `.pbix` was generated or tested in this environment.
