# VishwaaFX Quote Desk — what it does (v1.5.0)

Live app: https://dicksonpjo-sys.github.io/quote-desk/

## 1. Start screen

Opens with **"What are you preparing?"** and two choices. Each has its own dashboard, numbers and totals.

| Choice | For | Number format | Bank account on the PDF |
|---|---|---|---|
| **Project Quote** | VFX work for films, web series, ads | `VFX/26-27/001` | Studio – Bank of India |
| **On-Site Supervision** | Shoot days on set, travel, fuel, food | `SUP/26-27/001` | Dickson – HDFC |

Numbers follow the Indian financial year (April–March) and restart at 001 every April.

## 2. Dashboards

- **Project groups:** quotes for the same film (e.g. Mayan and Mayan (Additional)) show as one project
  card listing every quote, with a combined total, received and due. Group from a quote's ⋯ menu →
  "Group with another quote"; undo with "Remove from project". Each quote keeps its own number, PDF
  and payments.
- **Sort:** latest updated (default), quote no., quote date, amount, client or status.

- **Summary band:** money to collect, amount quoted and waiting for approval, amount received, and
  quotes expiring within 7 days.
- **Category tabs** (project quotes): Feature Film, Web Series, Ad Film, Music Video, Corporate, Other.
  You can edit the list in Settings.
- **Search** by name, client or quote number, and **filter** by status.
- **Project cards** show the status (Draft, Sent, Approved, In Progress, Closed, Lost), expiry warnings,
  and a received/due bar.

## 3. Project quotes

- **Two structures:**
  - **Bills:** each bill has one **heading** you type (e.g. "Additional Bill F - 25-11-26"). Exactly
    that text is used in the app, on page 1 of the PDF and as the breakdown heading. Left empty, the
    bill shows "Initial Bill", "Additional Bill A"… An optional note can go under the heading.
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

### Versions (Versions tab)
- Every sent version is kept: **Original, R1, R2…** plus the one being edited.
- **View** any version, make its **PDF** (with its own number, e.g. without -R1 for the original),
  or **Restore** it into the current quote.
- **Compare** two versions: total before → after, lines added / removed / changed, discount, screen
  time and note changes.
- **Start revision** is on this tab.

### Studio project ID
- Optional, under Details. Links the quote to its project in Studio Console.

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

- **Studio Console summary:** `quote_desk_index.json` in the studio folder is rebuilt on every sync
  from the live quotes (no PDF needed) and read by Studio Console. No bank details.

- **Sign-in lock:** the app opens only after signing in with an allowed Google account
  (vishwaafxacc, or an account on its Who has access list). Others see a sign-in screen only.
  A phone that has been checked works offline for up to 30 days. Removing an account locks it
  out and clears the quotes from its phone. "Sign out" in Settings locks the app on that device.

- **One studio data file** lives in **vishwaafxacc@gmail.com**'s Drive (moved from vishwaafx@gmail.com
  in v1.3.0). Sign in with vishwaafxacc, or with vishwaafx or dicksonpjo after it is shared with them,
  and you see the same quotes on every phone and computer.
- **Who has access** (Settings, as vishwaafxacc) lists every account that can open the studio data.
  Add an account as **Editor** or **View only**; **Remove** takes it off the data folder and the backups
  folder. A new account must first be added as a test user in Google Cloud (Google Auth Platform →
  Audience → Test users). Other accounts see who owns the data and what access they have.
- An account that has not been given access works on the phone only and writes nothing to Drive.
  A View only account can open quotes and preview PDFs but cannot change anything.
- **Offline:** everything is saved on the device and syncs when the connection is back.
- **Backups:** saved in `VishwaaFX Quotes Backups/<month>/` as numbered versions:
  - an **automatic** one every day at 9 PM (or on the next open if the app was closed),
  - **"Back up to Drive now"** whenever you want one.
  Only the studio account makes backups, so vishwaafxacc owns them all.
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
