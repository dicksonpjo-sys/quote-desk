# studio_console_receipts.json — client payments from Studio Console (Quote Desk v1.7.0)

Studio Console is where client payments are entered. It publishes them in this file; Quote Desk only
**reads** it, on every sync, and never writes to it. (In the other direction, Studio Console only reads
`quote_desk_index.json`.) Each app writes only its own file.

**Where:** a folder of Studio Console's own in **vishwaafxacc@gmail.com**'s Drive (e.g.
`My Drive/VFX Studio Console/studio_console_receipts.json`), shared as **View only** with
vishwaafx@gmail.com and dicksonpjo@gmail.com so every Quote Desk phone can read it. Never inside the
"VishwaaFX Quotes" folder. Quote Desk finds it by name (the copy owned by vishwaafxacc first), so keep
exactly one file with this name and do not rename it.

**When:** rewrite the whole file every time a receipt is added, changed or deleted.

```jsonc
{
  "schema": 1,
  "app": "VFX Studio Console", "appVersion": "5.19",
  "generatedAt": "2026-11-25T10:00:00.000Z",       // when this file was written
  "receipts": [{
    "id": "rcpt_…",                                // Studio Console's own stable receipt id
    "quoteId": "prj_…",                            // quotes[].id from quote_desk_index.json (required)
    "billId": "sec_…",                             // quotes[].bills[].id, or null when not tied to a bill
    "amount": 26860,                               // rupees received, a plain number > 0
    "date": "2026-11-24",                          // YYYY-MM-DD the money came in
    "ref": "NEFT 1234",                            // optional: UTR / cheque / cash
    "note": "",                                    // optional
    "deleted": false                               // optional: true = ignore (or simply leave it out)
  }]
}
```

**What Quote Desk does with it (rules agreed with Dickson, 25 Nov 2026):**
- A bill that has receipts here shows **Studio Console's figures**: received = sum of its receipts;
  **Paid** when that covers the bill's amount, otherwise **Partial**; date = latest receipt. Its
  Quote Desk payment buttons are replaced by the receipt list ("From Studio Console").
- A bill with **no** receipts here keeps whatever was marked in Quote Desk.
- A receipt with `billId: null`, or a `billId` the quote does not have, is **unassigned**: counted in the
  quote's received total and listed under "Unassigned receipts" on the quote's Payments tab.
- Receipts with `deleted: true`, no `quoteId`, or an amount of 0 or less are ignored.
- The receipts are never copied into Quote Desk's own data file. Dashboard totals, the project page,
  PDFs (payment column, project statement) and `quote_desk_index.json` all use the combined figures
  (`bills[].payment.source` = `"console"` or `"desk"`).
