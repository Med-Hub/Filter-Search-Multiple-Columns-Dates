# Exact-result sample: synthetic data only

Import `Create_Release_Sample.pq` as a blank Power Query named **ReleaseSample**. It is self-contained and has no external data source. `Sample_Records.csv` is an alternative; preserve Code/HFB as Text when importing CSV.

Use **RecordKey** in the Record key well. R001 and R002 deliberately share ArticleNo but have different delivery records. Do not deduplicate them. Add ArticleNo, ArticleName, Supplier, Code and UnitPrice to Search fields; add DeliveryDate/StartDate as plain columns in Date fields. Start each case with the other search/date conditions cleared. Select the fields/mode shown in `Expected_Results.json`.

Date cases need the final configured Service ID plus an assigned licence. The 0.6.2 candidate has the real Service ID configured, but an unlicensed user must still have paid dates locked. Do not turn off licensing to run the sample.

## Expected results

| Case | Search/date/context | Record keys |
|---|---|---|
| C01 | OR across ArticleName and Supplier | R001, R002, R003, R008 |
| C02 | Disabled Supplier must not contribute | R001, R002, R008 |
| C03 | Accent-sensitive variant | R008 |
| C04 | BILLY can match either column | R004, R005, R006 |
| C05 | Every field on the same row | R006 |
| C06 | Exact whole-cell BILLY | R006 |
| C07 | Starts with STRALA | R001, R002, R003, R008 |
| C08 | Preserved leading zeros | R001, R002 |
| C09 | Numeric article search | R001, R002 |
| C10 | Negative decimal numeric search | R005 |
| C11 | Specific day includes 23:59:59 | R001, R003, R009 |
| C12 | Between includes both boundaries | R001, R002, R003, R004, R005, R007, R009 |
| C13 | Text AND date apply to the same row | R001, R003 |
| C14 | Blank delivery dates | R006, R012 |
| C15 | On or before | R001, R003, R009, R010 |
| C16 | On or after | R005, R007, R008, R011 |
| C17 | Leap day | R011 |
| C18 | HFB 02 context plus BILLY | R004, R006 |
| C19 | No matches emits contradiction | None |

These expectations are authored independently of the search result function and are checked by `tests/release-sample.test.cjs`. They are reference outcomes, NOT a record of a Power BI Desktop test.

## Build the public sample report

Use three pages: (1) Setup and key-grain example; (2) Free multi-column search next to a standard Table showing RecordKey; (3) Date Filter Pro next to a standard date slicer for comparison. Keep product subscription disclosure visible. Use only the final submitted .pbiviz version. Save as an offline .pbix in Power BI Desktop and repeat tests in Service. Do not package employer/private report data.

No .pbix is supplied by this kit; it must be saved and verified in Power BI Desktop. This synthetic fixture does not replace Microsoft’s separately prescribed sample test dataset.
