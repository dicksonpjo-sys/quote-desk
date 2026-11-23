# VishwaaFX Quote Desk — guide for Claude Code

Read this first in every session. It explains what the app is, how it is built, the rules that
must not break, and how to test and ship a change.

- **Owner:** Dickson P Jo (VishwaaFX, Kochi). Talks in short messages; wants to see what you are
  doing as you do it, and to approve anything that changes live data or goes live.
- **Live app:** https://dicksonpjo-sys.github.io/quote-desk/ (GitHub Pages, `main` branch, root folder)
- **Current version:** v1.2.2 (`APP_VERSION` in `js/data.js`)
- **User guide:** `docs/FEATURES.md` · **Hosting and Google setup:** `SETUP.md` · **History:** `docs/CHANGELOG.md`

## What it is

A phone-first quotation app that replaces the studio's Excel quotes. Plain HTML, CSS and JavaScript:
no framework, no build step, no server. It installs as a PWA, works offline, and syncs one JSON
file to Google Drive. PDFs are generated in the browser.

Two kinds of documents, chosen on the start screen:
1. **Project Quote** (`kind: 'quote'`) — numbered `VFX/26-27/001`
2. **On-Site Supervision bill** (`kind: 'supervision'`) — numbered `SUP/26-27/001`

## File map

| File | What it does |
|---|---|
| `index.html` | Shell. Loads every script with `?v=<version>`; bump these on each release. |
| `js/config.js` | Google OAuth Client ID and `VFXQ_DATA_OWNER` (studio account `vishwaafx@gmail.com`). |
| `js/data.js` | `APP_VERSION`, data model, default settings (company, banks, note blocks, templates), number formats, calculations, quote numbering, `mergeStores`. |
| `js/sample.js` | Starter quotes rebuilt from real PDFs (Law and Order, Moshi Moshi, 40 Days, Mayan). Fixed ids `sample_*`. |
| `js/sync.js` | Google sign-in (OAuth token redirect flow) and every Drive call: shared studio file, merge, PDFs, versioned backups, sharing. |
| `js/pdf.js` | PDF builder (pdf-lib). Monochrome letterhead, summary page + breakdown pages, single page, supervision bill, page selection. |
| `js/app.js` | All screens, actions, PDF viewer (pdf.js), sync loop, restore, boot. |
| `css/app.css` | App styles (green VishwaaFX theme, light + dark). The PDF does not use these. |
| `sw.js` | Service worker: offline cache. Bump `CACHE` name on each release. |
| `vendor/` | pdf-lib (PDF writing) and pdf.js (PDF preview), bundled so the app works offline. |
| `fonts/` | Poppins subset (OFL). |
| `logo.png`, `logo_mono.png` | Colour logo (letterhead) and grey logo (PDF watermark). |

## Data model (stored in localStorage `vfxq.data.v2` and in Drive)

```
store = { schema: 1, settings, projects: [Project], meta }       // meta is per device, never uploaded
Project = { id, kind: 'quote'|'supervision', fy: '26-27', seq, rev, name, category, client, clientLabel,
            date, validDays, status, templateId, mode: 'batches'|'tiers', singlePage, signatoryId, bankId,
            blocks: [NoteBlock copy], sections: [Section], selectedTier, pdf: {title, copyLabel,
            showPayment, showGst, showMinutes, gstText, showSignature}, revisions: [], createdAt,
            updatedAt, deleted }
Section = { id, name, summaryDesc, subtitle, lines: [Line], discountType: none|final|amount|percent,
            discount, durMode: sum|max|manual, durManual, pay: {status: Pending|Partial|Paid, received, date} }
Line    = { id, desc, type: 'rate'|'lump', sec, rate, amount, date }   // date used by supervision bills
```

- Sections in `batches` mode are labelled by position: **Initial Bill**, then **Additional Bill A, B, C…**
  (`secLabel`, `billLetter`). The optional `name` is only a title after the label.
- `tiers` mode = quality options (Premium / Standard); `selectedTier` = the option the client approved.
- Quote number: `prefix/fy/seq` + `-R1` for revisions. Indian financial year, restarts every April.
  Supervision has its own sequence and prefix.
- Money is shown in Indian format (`inr()` → 13,93,650). GST is a note only, never calculated.

## Sync rules (do not break)

- **One studio file:** `vishwaafx_quotes_data.json` in `My Drive/VishwaaFX Quotes/` of **vishwaafx@gmail.com**.
  Any other account (dicksonpjo@gmail.com) uses the same file once the folder is shared with it
  (Settings → Share studio data). A separate copy found in another account is merged in once and
  renamed `merged_<date>_…`.
- **Merge, never overwrite blindly:** `mergeStores` keeps the newest `updatedAt` per project and per
  settings. Every edit must call `touchP(p)` or `touchS()` so its timestamp moves. Deletes are soft
  (`deleted: true`) so they sync.
- **Restore = re-stamp:** "Replace everything" stamps restored records with now and soft-deletes the
  rest; otherwise the newer Drive copy would win the next merge (the bug fixed in v1.2).
- **Backups:** only the studio account writes them, into `My Drive/VishwaaFX Quotes Backups/<YYYY-MM>/`
  as `v0001_<date>_<HHMM>_<auto|manual>.json`. Automatic one: first sync after 9 PM, or a catch-up
  on the next open.
- **Scope:** `https://www.googleapis.com/auth/drive`. The Google Cloud project is in **Testing** mode;
  only listed test users can sign in (vishwaafx@gmail.com, dicksonpjo@gmail.com).
- Token lasts one hour; the app refreshes it with a silent redirect. No secrets live in the repo:
  the OAuth Client ID is public by design.

## Google Cloud (project "VishwaaFX Quote Desk", id `vishwaafx-quote-desk`, owner vishwaafx@gmail.com)

- Google Drive API enabled.
- OAuth client "Quote Desk web": origin `https://dicksonpjo-sys.github.io`, redirect
  `https://dicksonpjo-sys.github.io/quote-desk/`.
- To test Drive from a computer, also add origin `http://localhost:8080` and redirect
  `http://localhost:8080/` to that client (Google Auth Platform → Clients). Ask Dickson first.

## Run and test

```bash
python3 -m http.server 8080          # then open http://localhost:8080
node --check js/*.js                 # syntax check before every commit
node tests/logic_test.js             # calculations, numbering, financial year, merge (no installs)
node tests/screens_test.js           # every screen + every PDF layout at phone size, no errors
python3 tests/drive_sim_test.py      # two-account Drive simulation + 9 PM backup checks (needs: pip install playwright; playwright install chromium)
```

In the Claude Code cloud container: Node Playwright is pre-installed. For the Python test run
`pip install playwright==<same version as node's>` and prefix the command with
`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`.

`tests/drive_sim_test.py` fakes Google Drive and checks: private copy → owner file → sharing →
merge of the stray copy → backups visible to both → "Replace everything" restore → PDF save.
Run it after any change to `js/sync.js`, `mergeStores` or restore.

## Release checklist

1. Bump `APP_VERSION` in `js/data.js`, `CACHE` in `sw.js`, and every `?v=` in `index.html`.
2. `node --check js/*.js` and run the simulation test.
3. Open the app locally; check the start screen, a quote, the PDF preview and Settings.
4. Add an entry to `docs/CHANGELOG.md`.
5. Show Dickson what changed and get his OK, then commit and push to `main`. GitHub Pages goes
   live in about a minute; phones pick it up on next open.

## Known issues / next up

- **Duplicate auto backups:** fixed in v1.2.1. Automatic backup names carry the day they cover;
  `autoBackupDay()` in `js/sync.js` reads both new names and the old wrongly-dated ones.
- PDFs saved while signed in as dicksonpjo are stored in the studio folder but owned by that account
  (Google personal accounts cannot transfer ownership automatically).
- Non-Latin text (Malayalam) prints as `?` in PDFs: the PDF uses Helvetica. Would need an embedded
  Unicode font (pdf-lib + fontkit).
- Ideas Dickson raised earlier: import shot/second breakdown from the VFX Edit Tool Kit CSV into quote lines.

## Roadmap agreed 23 Nov 2026 (one purpose per version)

- **v1.3.0 — Move studio data to vishwaafxacc@gmail.com.** It becomes the owner (data file, backups,
  PDFs). Needs: vishwaafxacc added as test user in Google Auth Platform; a full backup first; a
  one-time, confirmed move; old vishwaafx copy kept read-only as an archive. Plan to be approved first.
- **v1.4.0 — Studio Console link.** Read-only `quote_desk_index.json` next to the data file (quote no.,
  kind, project, client, category, created/quote/valid-till dates, status, total, received, due,
  updated, PDF link; no bank details). Optional Studio project ID on each quote. Studio Console runs
  on vishwaafxacc@gmail.com and only reads. Write the Studio Console prompt once the format is final.
- **v1.5.0 — Browse quote revisions:** Versions tab per quote (Original, R1, R2…), view, PDF, compare.
- **v1.6.0 — Clearer quote screen:** labelled sections (details / bills / totals & discount / payments),
  column headings on lines, nothing hidden behind the total bar.
