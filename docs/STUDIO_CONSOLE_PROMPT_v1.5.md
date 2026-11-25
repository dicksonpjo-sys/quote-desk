# Prompt for the Studio Console chat — Quote Desk v1.5.0 changes

Copy everything below the line into the Studio Console chat (the one that built the Quote Desk reader).

---

Read the Studio Console build log first (studio-console-buildlog) and tell me the last SHIPPED version
and anything PLANNED. Plan this as the **next Studio Console version, one purpose: follow Quote Desk
v1.5.0 and show only live work by default**. Write its PLANNED block in the log before any code.

**What changed in Quote Desk v1.5.0 (live 25 Nov 2026)** — `quote_desk_index.json` is still schema 1;
only fields were added, nothing removed (full format: `docs/STUDIO_CONSOLE_INDEX.md` in the
`dicksonpjo-sys/quote-desk` repo):
- `quotes[].groupId` / `quotes[].groupName`: quotes of one film grouped in Quote Desk share a `groupId`
  (e.g. "Mayan" + "Mayan (Additional) After 10-11-26"). Each quote keeps its own `id`, number, bills and PDF.
- `quotes[].bills[].heading`: the bill heading exactly as printed on the PDF (e.g. "Additional Bill F -
  25-11-26"). `label` is still only the position (Initial Bill, Additional Bill A…) and `id` (v1.4.1) is
  still the stable bill id.

**What to change**
1. **Default view = Approved and In Progress only.** On open, Studio Console lists and totals only quotes
   with `status` "Approved" or "In Progress". Draft, Sent, Closed, Lost and expired quotes (Draft/Sent whose
   `validTill` is past) are hidden.
2. **One button to show the rest**, e.g. "Show drafts, sent, closed & expired". When on, those quotes appear
   too, clearly marked by status (and "Expired" where `validTill` is past). Remember the choice per device.
   Say on screen which filter is active.
3. **Project groups:** quotes with the same `groupId` show together under `groupName` as one project, with
   each quote and its bills listed under it, and the project's combined total. If they also carry a
   `studioProjectId`, they belong to that Studio project as before.
4. **Bill names:** show `bills[].heading` wherever a bill is named (fall back to `label` if `heading` is
   missing in an older file). Keep tying receipts to the bill `id` together with the quote `id`, never to
   the label or heading (headings can be edited, and a duplicated quote copies its bills' ids).

**Keep as it is:** read-only (never write in the "VishwaaFX Quotes" folder); quote identity by `id`;
supervision (`kind: "supervision"`) kept apart from VFX quotes; payments recorded in Studio Console, not
taken from Quote Desk; Indian number format, "excl. GST".

**How to build and ship** — as every Studio Console version: start from the last confirmed-working file,
ask me with click-through questions before building, verify headless against a sample index (a grouped
project like Mayan with three bills with typed headings, an Approved, an In Progress, a Draft, a Sent that
has expired, a Closed and a supervision bill: default view shows only the Approved + In Progress ones; the
button brings back the rest), show me screenshots, and ask before going live. Then flip the log block to
SHIPPED with the verification table.
