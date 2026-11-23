# Changelog

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
