# quote_desk_index.json — format for Studio Console (v1.5.0)

Where: `My Drive/VishwaaFX Quotes/quote_desk_index.json` in **vishwaafxacc@gmail.com**, next to
`vishwaafx_quotes_data.json`. Studio Console only **reads** it.

- Rebuilt from the live quote data on every sync (no PDF needed). Created by vishwaafxacc; Editor
  accounts (vishwaafx, dicksonpjo) update it on their own sync, so it is near-live. View only accounts
  never write it. It is only rewritten when something changed.
- Money is in rupees as plain numbers, **excluding GST**. Dates are `YYYY-MM-DD`; timestamps are ISO.
- No bank details are ever written.

```jsonc
{
  "schema": 1, "app": "VishwaaFX Quote Desk", "appVersion": "1.4.0",
  "currency": "INR", "gst": "excluded",
  "generatedAt": "2026-11-23T15:20:00.000Z", "generatedBy": "dicksonpjo@gmail.com",
  "quotes": [{
    "id": "prj_…",                    // stable Quote Desk id: use this to match records
    "quoteNo": "VFX/26-27/002-R1",     // with -R<n> when revised
    "kind": "quote",                   // "quote" | "supervision"
    "rev": 1,
    "studioProjectId": "STU-042",      // typed on the quote (Details → Studio project ID), or null
    "groupId": "prj_…",                // v1.5.0: quotes of one project grouped in Quote Desk share this; null if not grouped
    "groupName": "Mayan",              // v1.5.0: the group's name (its first quote's name), or null
    "project": "Law and Order", "client": "Satyam Cinemas …", "clientLabel": "Production",
    "category": "Feature Film",        // null for supervision bills
    "status": "In Progress",           // Draft | Sent | Approved | In Progress | Closed | Lost
    "createdAt": "…", "quoteDate": "2026-09-15", "validTill": "2026-10-15", "updatedAt": "…",
    "layout": "bills",                 // "bills" | "options" | "supervision"
    "optionApproved": null,            // options only: true / false
    "total": 1393650,                  // options: the approved option only; null until one is approved
    "received": 1330650, "due": 63000,
    "committed": true,                 // counts as business (Approved / In Progress / Closed; supervision from Sent)
    "bills": [{
      "id": "sec_…",                   // stable bill id: never changes when bills are added, removed or reordered
      "label": "Initial Bill",         // position only: then "Additional Bill A", "B"…; options: the option name; supervision: "Bill"
      "heading": "Additional Bill D After 10-11-28",  // v1.5.0: the bill heading exactly as printed on the PDF (label when none typed)
      "title": "",                     // the heading as typed ("" when none): show `heading` instead
      "gross": 900000, "discount": 0, "amount": 900000,
      "screenTimeSec": 955,            // null for supervision
      "payment": { "status": "Paid", "received": 900000, "date": "2026-10-02" }  // Pending | Partial | Paid
    }],
    "pdf": { "name": "…pdf", "savedAt": "…", "link": "https://drive.google.com/file/d/<id>/view" }  // null if never saved to Drive
  }]
}
```

Mapping rule (Dickson, 23 Nov 2026): **one Studio project ID per quote**; every bill of a multi-bill
project (e.g. Mayan: Initial Bill, Additional Bill A, B…) is listed under that quote with its own
amount and payment. Deleted quotes are left out.
