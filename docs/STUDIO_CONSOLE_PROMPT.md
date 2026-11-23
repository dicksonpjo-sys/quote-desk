# Prompt for the Studio Console chat — read Quote Desk quotes

Copy everything below the line into a new Studio Console chat.

---

Read the Studio Console build log first (studio-console-buildlog). Tell me the last SHIPPED version,
anything PLANNED, and the parked items. **The live Studio Console is v5.17** (Dickson, 23 Nov 2026):
build on the confirmed-working v5.17 file. Plan this as **v5.18, one purpose: show Quote Desk money
per project (read-only)**. If the log already has a v5.18 planned for something else, tell me and
use the next free number. Write its PLANNED block in the log before any code.

**What exists now (Quote Desk v1.4.0, live 23 Nov 2026)**
Quote Desk keeps a summary file for Studio Console:
`My Drive/VishwaaFX Quotes/quote_desk_index.json` in **vishwaafxacc@gmail.com**, next to
`vishwaafx_quotes_data.json`. It is rebuilt from the live quotes every time any phone syncs, so it is
current even when no PDF was saved. Full format: `docs/STUDIO_CONSOLE_INDEX.md` in the
`dicksonpjo-sys/quote-desk` repo. Short version:

```
{ schema: 1, currency: "INR", gst: "excluded", generatedAt, generatedBy,
  quotes: [{
    id,                 // stable Quote Desk id — match on this
    quoteNo,            // "VFX/26-27/002-R1"  (supervision bills: "SUP/26-27/001")
    kind,               // "quote" | "supervision"
    studioProjectId,    // typed on the quote in Quote Desk, or null
    project, client, clientLabel, category, status,   // Draft|Sent|Approved|In Progress|Closed|Lost
    createdAt, quoteDate, validTill, updatedAt, rev,
    layout,             // "bills" | "options" | "supervision"
    optionApproved,     // options only
    total, received, due, committed,                   // rupees, excl. GST; total null = option not approved yet
    bills: [{ label, title, gross, discount, amount, screenTimeSec,
              payment: { status: Pending|Partial|Paid, received, date } }],
    pdf: { name, savedAt, link } | null
  }] }
```

**Rules (agreed with Dickson, 23 Nov 2026)**
1. **Read only.** Studio Console never writes, renames or moves anything in the "VishwaaFX Quotes"
   folder. Quote Desk is the only writer. No bank details are in the file; don't ask for them.
2. **One Studio project ID per quote.** Match `studioProjectId` to the Studio project. Every bill of
   that quote (Initial Bill, Additional Bill A, B… — e.g. Mayan) is shown under that one project, each
   with its own amount and payment status. A project can have several quotes (revisions share one
   `id`; a separate quote has its own).
3. Quotes with `studioProjectId: null` go in an **"Unlinked quotes"** list, so nothing is hidden.
   Show project name, client and quote no. so Dickson can type the ID into Quote Desk.
4. Quality-option quotes: only the approved option is in the file. `total: null` = "Option not
   approved yet".
5. Show money in Indian format (13,93,650) and say "excl. GST". Never compute GST.
6. Show when the data was last updated (`generatedAt`, by `generatedBy`). If the file is missing or
   unreadable, show a clear message and keep the rest of Studio Console working.
7. Find the file by name inside the "VishwaaFX Quotes" folder owned by vishwaafxacc@gmail.com.
   Don't hard-code file ids (the file can be recreated). Read it with the Google Drive access Studio
   Console already uses. If it has none, stop and propose the smallest option (read-only Drive scope)
   for my OK first.

**What to show (propose the layout, ask me with click-through questions before building)**
- Per Studio project: quotes with quote no., status, total, received, due, and each bill under it
  with amount, payment status and date. Link to the PDF when there is one.
- A studio-wide line: total committed, received, due (committed quotes only).

**How to build and ship** — same as every Studio Console version: start from the last confirmed-working
file, one purpose, verify headless against a sample index (make one from the format above with a
multi-bill project like Mayan, an options quote with and without an approved option, a supervision
bill, and an unlinked quote), show me screenshots, and ask before going live. Then flip the log block
to SHIPPED with the verification table.
