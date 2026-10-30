# Search / Date sample

Paste `Create_Search_Date_Sample.pq` into a new blank Power Query. It creates five synthetic records locally. Use RecordID as Record key; Article Name and Supplier as Search fields; Delivery Date as Date fields (optional). Article No can also be searched as a number. RecordID, not Article No, is unique across deliveries.

Expected record IDs with default Contains/Any:
- STRALA without dates: 1, 2, 3 (row 2 matches Supplier).
- STRALA on 8 October 2026: 1, 2 (both midnight and end-of-day).
- STRALA between 8 and 31 October: 1, 2, 3.
- No date / blank with no text: 5.
- On or after 1 November with no text: 4.

These are expected results for user verification in Power BI, not evidence that Power BI was run here.
