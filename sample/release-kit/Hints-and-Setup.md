# Hints & Setup — sample report page content

## Start with a unique record key

RecordKey identifies a delivery or transaction, not merely an article. Several records can share ArticleNo and must remain separate. Use fields from the same table.

## Free Search

Text and numeric search are free. Choose Contains, Starts with or Exact; Any matches one or more selected columns, Every requires the query in each selected column on the same record. Store identifiers as Text to preserve leading zeros. Search numbers using their underlying values, not currency symbols or display formatting.

## Date Filter Pro

Bind ordinary Date/DateTime columns, not automatic date hierarchies. Select one date column and one condition at a time. Date filtering requires a Microsoft-managed Date Filter Pro licence assigned to the signed-in user. The configured Service ID does not grant a licence. Free search remains available without the paid plan.

## Clear and saved filters

Use Clear to remove this visual's filter. If a bookmark or reopened report restores a filter without its original query, use the displayed recovery controls. Full restoration of search text/options from bookmarks is not promised.

## Limits and privacy

Up to 10 search fields, 5 date fields, 100,000 candidate rows and 5,000 matched record keys; additional data-size safeguards can stop a search earlier. Narrow large searches. This sample uses synthetic data and a self-contained Power Query. Do not put confidential customer information in the publicly distributed sample.

## Offline use and help

The sample's data must load without external connections. Free search can be exercised offline; do not imply that a paid licence can be retrieved offline. Explain the unavailable-licence state on the Date Filter Pro page.

Support: mmohsine@veiligstarten.nl — Veilig Starten.
