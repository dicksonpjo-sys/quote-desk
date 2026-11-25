# Changelog

## v1.7.0 — 25 Nov 2026
- **Payments from Studio Console.** Quote Desk reads `studio_console_receipts.json` (published by Studio Console in its own Drive folder) on every sync. A bill with receipts there shows Studio Console's figures (Paid / Partial, amount, latest date, each receipt listed); a bill with none keeps what was marked in Quote Desk. Receipts not tied to a bill show as "Unassigned receipts" and count in the quote's received total. Dashboard, project page, PDFs and the Studio Console summary file all use the combined figures. Settings shows how many receipts came in and when. Format: `docs/STUDIO_CONSOLE_RECEIPTS.md`; Studio Console prompt: `docs/STUDIO_CONSOLE_PROMPT_v1.7.md`.

## v1.6.0 — 25 Nov 2026
- **Project page:** tap a project card (e.g. Mayan) to open it. Every quote is listed with its bills collapsed (heading, payment, amount); tap a bill or "Expand all" to see each breakdown. Tap a quote to edit it or export its own PDF, as before.
- **Project PDF:** one "Project statement" for the whole project: page 1 lists every quote with its bills, payment status and one grand total (received and balance when paid); then the breakdown of every bill grouped by quote. Shows all quote numbers and today's date; lead quote's terms, signature and bank details.
- **Project cards readable:** each quote's title is on its own line, with the number and status under it.
- **Studio Console look:** graphite and green colours, Manrope font, numbers in JetBrains Mono, pill buttons (light and dark), bundled for offline use. Tidier quote details and bill headings on phones.

## v1.5.0 — 25 Nov 2026
- **One heading per bill, fully yours.** Each bill has one heading box; exactly that text is used in the app, on the PDF's page 1 and as the breakdown heading. "Initial Bill / Additional Bill A" is only the grey hint when the box is empty, never forced onto the PDF. Bills that had a separate "line on the quotation page" now use that line as their heading (Dickson's choice). The optional note under the heading stays.
- **Project groups.** Quote menu ⋯ → "Group with another quote": quotes of the same film (e.g. Mayan and Mayan (Additional)) show as one project card on the dashboard with every quote listed and a combined total, received and due. Each quote keeps its own number, PDF and payments. Quote Details shows the other quotes of the project.
- **Sort** the dashboard: latest updated (default), quote no., quote date, amount, client or status.
- **Compact screens:** tighter spacing on the dashboard, quote screen, bills and settings, so more fits on one screen.
- Studio Console file: each quote carries `groupId` / `groupName`; each bill carries `heading` (as printed on the PDF).

## v1.4.1 — 23 Nov 2026
- Studio Console index: each bill carries its id.

## v1.4.0 — 23 Nov 2026
Three planned updates in one release (1.4 + 1.5 + 1.6, Dickson's call).
- **Studio Console link.** `quote_desk_index.json` next to the data file, rebuilt from live quote data on every sync: quote no., project, client, category, status, dates, total, received, due, Studio project ID, PDF link, and every bill (Initial Bill, Additional Bill A, B…) with amount, discount, screen time and payment. Quality-option quotes report only the approved option. No bank details. Created by vishwaafxacc; Editor accounts keep it up to date. Format: `docs/STUDIO_CONSOLE_INDEX.md`.
- **Studio project ID** field on every quote (Details).
- **Versions tab:** Original, R1, R2… and the version being edited, each with View and PDF; Compare any two (total before → after, lines added / removed / changed, discount, screen time, notes). Start revision moved here from the PDF tab.
- **Clearer quote screen:** labelled sections (Details, Bills, Totals & discount, Totals & payments), column headings on lines (Type · Seconds · ₹/sec · Amount), a totals card listing every bill, received and balance, and the last card always clear of the total bar.
- Saving a PDF to Drive records its link on the quote.
- View only phones always take Drive's copy as it is.

## v1.3.2 — 23 Nov 2026
- **Sign-in lock.** The app opens only for Google accounts that can open the studio data: vishwaafxacc@gmail.com and the accounts in its Settings → Who has access. Any other account, or a browser that never signed in, sees only a sign-in screen. The check runs against Drive every time the app opens online; a checked phone keeps working offline for up to 30 days.
- An account that is removed from Who has access is locked out and its quotes are wiped from that phone at the next online open.
- Bank account numbers and the sample quotes are no longer in the app's public code. The real bank details come from the studio settings in Drive after sign-in. (The sample quotes moved to `tests/fixtures/` for testing only.)
- "Disconnect" is now "Sign out" and locks the app on that device.

## v1.3.1 — 23 Nov 2026
- **Who has access** (Settings, studio account only): lists every Google account that can open the studio data and backups folders, with Owner / Editor / View only. Add an account as Editor or View only; Remove takes it off both folders and checks that it is gone. An account on only one of the two folders is flagged. A note reminds that new accounts must first be test users in Google Cloud (Google Auth Platform → Audience).
- Other accounts see one line: who owns the studio data and whether they have Editor or View only access.
- **View only** accounts: quotes open and PDFs preview, but nothing can be changed, sync only downloads and PDFs are not saved to Drive.
- Fixed: "Some files from the old account were not copied yet" after the move. Opening the app as vishwaafx@gmail.com before it had access made a new data file in its old folder, which looked like an unfinished move. Now an account without access never makes its own copy (it works on the phone only and says who to ask), and any late copy from the old account is merged in and renamed `merged_…`.

## v1.3.0 — 23 Nov 2026
- The studio data account is now **vishwaafxacc@gmail.com**. One-time move in Settings → "Move studio data here": copies the quotes, every backup and every PDF into vishwaafxacc's Drive (copies are owned by it), checks the copy, then renames the old data file `moved_to_vishwaafxacc_…`. Nothing is deleted; the old vishwaafx folders stay as an archive. Until the move, every account keeps using the old file, and quotes typed on other phones during the move are merged in.
- vishwaafx@gmail.com becomes an extra user once vishwaafxacc shares the studio data with it.
- A clear message when Google blocks an account that is not on the test-user list.
- The "Share studio data" box is no longer pre-filled.
- Drive lists now follow every page (a month folder with more than 50 backups was cut off before).

## v1.2.2 — 23 Nov 2026
- Quote numbers are never reused. Deleting VFX/26-27/005 no longer gives 005 to the next new quote, so a number already sent to a client stays unique. Same for SUP numbers.

## v1.2.1 — 23 Nov 2026
- Fixed: duplicate 9 PM automatic backups. A catch-up made the next morning is now named for the day it covers (`v0016_2026-11-22_2100_auto.json`) and filed in that day's month folder. The "already done?" check reads the month folder in Drive, so a second phone or a cleared browser no longer writes the same day again. Old wrongly-named catch-ups (like v0015 on 23 Nov) are recognised.
- New tests: `tests/logic_test.js` (money format, financial year, numbering, discounts, screen time, payments, merge) and `tests/screens_test.js` (every screen and every PDF layout at phone size). The Drive simulation now checks the 9 PM backup across devices and month change.

## v1.2.0 — 26 Oct 2026
- One shared studio data file in vishwaafx@gmail.com; other accounts use it once shared. Old separate copies are merged in automatically.
- "Share studio data" in Settings (studio account only).
- Restore now really restores: "Replace everything" or "Only add missing quotes", from a file or from a Drive backup.
- Versioned backups in their own Drive folder, `VishwaaFX Quotes Backups/<YYYY-MM>/v0001_…json`. Automatic daily at 9 PM, plus "Back up to Drive now". Only the studio account writes backups.
- Settings shows which account is signed in and whether the data is shared.
- Updates reach phones straight away (versioned file URLs, service worker always fetches fresh files).

## v1.1.0 — 26 Oct 2026
- Start screen: Project Quote or On-Site Supervision, each with its own dashboard.
- Bills named Initial Bill, Additional Bill A, B, C…
- PDF: summary page + breakdown page by default, single-page option, page picker on export, new black-and-white design (colour logo only).
- Supervision bills with dated entries, separate numbering (SUP) and HDFC account. Multiple bank accounts in Settings.

## v1.0.0 — 26 Oct 2026
- First release: dashboard by category, quote builder with batches or quality options, rate memory, discounts, payments, revisions, notes library and templates, letterhead PDF export, Google Drive sync, offline PWA.
