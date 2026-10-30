let
    Source = #table(
        type table [RecordKey=text, ArticleNo=Int64.Type, ArticleName=nullable text, Supplier=text, HFB=text, Code=text, UnitPrice=number, DeliveryDate=nullable datetime, StartDate=nullable date],
        {
            {"R001", 10001001, "STRÅLA pendant lamp", "Nordic", "01", "00123", 12.5, #datetime(2026,10,8,0,0,0), #date(2026,10,1)},
            {"R002", 10001001, "STRÅLA pendant lamp", "Nordic", "01", "00123", 12.5, #datetime(2026,10,19,23,59,59), #date(2026,10,1)},
            {"R003", 10001002, "Plain lamp", "STRÅLA Supply", "02", "00124", 0, #datetime(2026,10,8,23,59,59), #date(2026,10,1)},
            {"R004", 10001003, "BILLY shelf", "Northline", "02", "00125", 40, #datetime(2026,10,12,10,0,0), #date(2026,10,2)},
            {"R005", 10001004, "Plain desk", "Billy Supply", "03", "00126", -2.5, #datetime(2026,10,31,23,59,59), #date(2026,10,3)},
            {"R006", 10001005, "BILLY", "Billy Wholesale", "02", "00127", 99, null, #date(2026,10,1)},
            {"R007", 10001006, "Café table", "Acme", "03", "00128", 25, #datetime(2026,10,31,0,0,0), #date(2026,10,3)},
            {"R008", 10001007, "STRALA shade", "Nordic", "01", "00129", 9, #datetime(2026,11,1,0,0,0), #date(2026,10,1)},
            {"R009", 10001008, "Plain chair", "Acme", "02", "00130", 12, #datetime(2026,10,8,12,0,0), #date(2026,10,1)},
            {"R010", 10001009, "MÖRBYLÅNGA table", "Northline", "03", "00131", 12.5, #datetime(2026,9,30,23,59,59), #date(2026,9,1)},
            {"R011", 10001010, "Code sample", "Acme", "04", "10001001", 1e-07, #datetime(2028,2,29,0,0,0), #date(2028,2,1)},
            {"R012", 10001011, null, "Acme", "04", "00132", 8, null, null}
        }
    )
in
    Source
