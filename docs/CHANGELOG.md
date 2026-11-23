# Changelog

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
