# Prompt for the Studio Console chat — publish client receipts for Quote Desk

Copy everything below the line into the Studio Console chat.

---

Read the Studio Console build log first (studio-console-buildlog) and tell me the last SHIPPED version
and anything PLANNED. Plan this as the **next Studio Console version, one purpose: publish the client
receipts I record here so Quote Desk shows the same payments**. Write its PLANNED block in the log
before any code.

**Why:** I record client payments in Studio Console. Quote Desk (v1.7.0, live) now reads them, but only
from a file Studio Console publishes. Today nothing reaches Quote Desk.

**What to build**
1. Every time a receipt is added, changed or deleted, write `studio_console_receipts.json` — the whole
   list, rewritten — in a folder of Studio Console's own in **vishwaafxacc@gmail.com**'s Drive, e.g.
   `My Drive/VFX Studio Console/`. Never inside the "VishwaaFX Quotes" folder (that one stays read-only
   for Studio Console). Exactly one file with that name; never rename it.
2. Share that folder **View only** with vishwaafx@gmail.com and dicksonpjo@gmail.com (once), so every
   Quote Desk phone can read it.
3. Format (full spec: `docs/STUDIO_CONSOLE_RECEIPTS.md` in the `dicksonpjo-sys/quote-desk` repo):
   ```
   { "schema": 1, "app": "VFX Studio Console", "appVersion": "<version>", "generatedAt": "<ISO time>",
     "receipts": [{ "id": "<your receipt id>", "quoteId": "<quotes[].id>", "billId": "<bills[].id or null>",
                    "amount": 26860, "date": "YYYY-MM-DD", "ref": "NEFT …", "note": "" }] }
   ```
   `quoteId` and `billId` are the ids you already read from `quote_desk_index.json` (match on the quote
   `id` plus the bill `id`, never the label or heading). A receipt not tied to a bill gets
   `"billId": null`. Deleted receipts: leave them out (or `"deleted": true`).
4. Include **every receipt already recorded** in the first file, so the payments I entered before show
   up in Quote Desk straight away.
5. Show me in Studio Console when the file was last published, and an error if writing it failed.

**How Quote Desk uses it** (so you can check the result): a bill with receipts shows Paid when they cover
its amount, else Partial, with the latest receipt date; a bill with none keeps Quote Desk's own mark;
receipts without a known bill are listed as "Unassigned" and counted in the quote's received total.
Quote Desk's `quote_desk_index.json` then carries the same figures with `payment.source: "console"`.

**Keep as it is:** Studio Console never writes in "VishwaaFX Quotes"; everything from the previous
versions (Approved / In Progress default, project groups, bill headings) stays.

**How to build and ship** — as every Studio Console version: start from the last confirmed-working file,
ask me with click-through questions before building, verify headless (a bill paid in two receipts, a
part-paid bill, a receipt without a bill, a deleted receipt; the written file matches the format),
show me screenshots, ask before going live, then flip the log block to SHIPPED with the verification
table. After it is live I sync a Quote Desk phone and check the Payments tab of Mayan.
