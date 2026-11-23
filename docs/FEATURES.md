# VishwaaFX Quote Desk — what it does (v1.2.1)

Live app: https://dicksonpjo-sys.github.io/quote-desk/

## 1. Start screen

Opens with **"What are you preparing?"** and two choices. Each has its own dashboard, numbers and totals.

| Choice | For | Number format | Bank account on the PDF |
|---|---|---|---|
| **Project Quote** | VFX work for films, web series, ads | `VFX/26-27/001` | Studio – Bank of India |
| **On-Site Supervision** | Shoot days on set, travel, fuel, food | `SUP/26-27/001` | Dickson – HDFC |

Numbers follow the Indian financial year (April–March) and restart at 001 every April.

## 2. Dashboards

- **Summary band:** money to collect, amount quoted and waiting for approval, amount received, and
  quotes expiring within 7 days.
- **Category tabs** (project quotes): Feature Film, Web Series, Ad Film, Music Video, Corporate, Other.
  You can edit the list in Settings.
- **Search** by name, client or quote number, and **filter** by status.
- **Project cards** show the status (Draft, Sent, Approved, In Progress, Closed, Lost), expiry warnings,
  and a received/due bar.

## 3. Project quotes

- **Two structures:**
  - **Initial + additional bills:** Initial Bill, then Additional Bill A, B, C…, each with an optional
    title such as "Trailer & Teaser".
  - **Quality options:** Premium / Standard side by side. Tick the option the client approved.
- **Line types:** *per second* (seconds × rate) or *fixed amount*.
- **Rate memory:** typing a department fills in the last rate you used for it, with the same category
  preferred. "Copy rates from another quote" updates a whole bill.
- **Discount per bill:** final amount, rupee amount, or percent.
- **Screen time in the TOTAL row:** add up all lines, take the longest line when departments work on
  the same shots (so 5 × 21 s shows 21 s, not 63 s), or type it in. The app warns when every line has
  the same seconds.
- **Payments per bill:** Pending / Partial (with the amount) / Paid, with the date. Totals feed the dashboard.
- **Revisions:** "Start revision R1" keeps the sent version and continues as `…/001-R1`. Any older
  version can be restored.
- **Duplicate**, **delete**, and **copy from an earlier quote** when creating a new one.

## 4. On-site supervision bills

- Dated entries printed in date order.
- **+ Supervision day** adds the next day at the day rate (₹5,000 by default, set in Settings).
- **+ Expense** adds fuel, food, travel, stay and similar items.
- Optional discount. Counts as "to collect" once the status is Sent.

## 5. Terms, notes and templates

- **Notes library:** reusable blocks such as payment terms 40/50/10 (film), payment terms 50/25/25
  (ad), music licence notes, the tax note, the tax note with 2% TDS, VFX inputs & outputs,
  deliverables, bank details and supervision terms.
- Each block has a heading, a style (numbered, bullets, plain, bank box) and a place on the PDF:
  under the quotation table, under each breakdown, or after the last breakdown.
- **Templates** pick the structure, client label, signatory, single-page setting and which blocks to
  include. Each category has a default template.
- On a quote: edit notes for that quote only, add or remove blocks, change the order, "Save to library"
  to keep a change, "Reset notes from template", and choose the bank account and signatory.

## 6. PDF export

- **Design:** black-and-white letterhead with only the logo in colour, a grey logo watermark, the
  quote number and page numbers in the footer, ₹ sign and Indian number format.
- **Layouts:**
  - *Summary + breakdown* (default): page 1 lists every bill with the total; page 2 onwards gives
    each bill's cost breakdown.
  - *Single page:* every line on one page.
  - *Supervision bill:* date / description / amount.
- **Options:** title and copy label, Min:Sec column, payment status column, GST line text, signature block.
- **Export:** preview every page, **tick the pages to export** (all are ticked to start),
  Share / Download, or **Save to Drive** (`VishwaaFX Quotes/PDF/<quote>/`).

## 7. Google Drive, accounts and backups

- **One studio data file** lives in **vishwaafx@gmail.com**'s Drive. Sign in with vishwaafx or with
  dicksonpjo (after it is shared) and you see the same quotes on every phone and computer.
- **Share studio data** (Settings, as vishwaafx) gives another Google account edit access to the
  data folder and the backups folder.
- **Offline:** everything is saved on the device and syncs when the connection is back.
- **Backups:** saved in `VishwaaFX Quotes Backups/<month>/` as numbered versions:
  - an **automatic** one every day at 9 PM (or on the next open if the app was closed),
  - **"Back up to Drive now"** whenever you want one.
  Only the studio account makes backups, so vishwaafx owns them all.
- **Restore** from a Drive backup or from a downloaded file:
  - **Replace everything:** every device switches to exactly that backup.
  - **Only add missing quotes.**
- **Download backup:** saves an offline copy to the device.

## 8. Settings

Studio letterhead (logo, name, address, email, mobile) · quote prefixes and validity days ·
signatories · bank accounts (default per document type) · supervision day rate and entry
suggestions · categories and default templates · departments list · notes library · templates ·
appearance (system / light / dark).

## 9. Ways to open it

1. The link in any browser, on Android, iPhone, iPad, Windows or Mac.
2. Installed on the home screen:
   - Android: Chrome menu ⋮ → Install app
   - iPhone: Share → Add to Home Screen
   - Computer: install icon in the address bar
3. Google Drive directly, for PDFs and backups. Never edit the `.json` files by hand.
4. A downloaded backup file, loaded back with "Restore from a file".
