let
    Source = #table(
        {"Record ID", "Article number", "Article name", "Supplier", "HFB", "Available pieces"},
        {
            {1, "10412345", "BILLY bookcase white", "Northline", "HFB2", 120},
            {2, "10412346", "BILLY bookcase oak", "Northline", "HFB2", 86},
            {3, "70456780", "ARC desk natural", "Billy Supply", "HFB3", 45},
            {4, "20423456", "BILLY wall shelf", "Studio Wood", "HFB1", 141},
            {5, "00123456", "Plain chair", "Northline", "HFB4", 74},
            {6, "00990011", "Desk lamp", "Luma Works", "HFB5", 52},
            {7, "00770022", "Woven basket", "Studio Wood", "HFB2", 38},
            {8, "10220033", "Small side table", "Northline", "HFB1", 64},
            {9, "20220044", "Floor cushion", "Soft Goods", "HFB3", 27},
            {10, "30330055", "Dining bench", "Studio Wood", "HFB1", 19},
            {11, "00445566", "Café chair", "Accent Supply", "HFB4", 16},
            {12, "00556677", "Literal * ? ~ shelf", "Workshop", "HFB5", 31}
        }
    ),
    Typed = Table.TransformColumnTypes(Source, {
        {"Record ID", Int64.Type},
        {"Article number", type text},
        {"Article name", type text},
        {"Supplier", type text},
        {"HFB", type text},
        {"Available pieces", Int64.Type}
    })
in
    Typed
