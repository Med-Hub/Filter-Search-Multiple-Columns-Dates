let
    Source = #table(
        type table [RecordID = Int64.Type, #"Article No" = Int64.Type, #"Article Name" = text, Supplier = text, #"Delivery Date" = nullable datetime],
        {
            {1, 60637328, "STRÅLA lamp", "Northline", #datetime(2026, 10, 8, 0, 0, 0)},
            {2, 60637329, "BILLY shelf", "Strala Supply", #datetime(2026, 10, 8, 23, 59, 59)},
            {3, 60637328, "STRÅLA lamp", "Northline", #datetime(2026, 10, 31, 23, 59, 59)},
            {4, 1001, "Other", "West", #datetime(2026, 11, 1, 0, 0, 0)},
            {5, 0, "No delivery date", "Northline", null}
        }
    )
in
    Source
