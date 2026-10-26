# VishwaaFX Quote Desk – setup guide

The app is a set of web files. You host them once at your own free web address, connect Google Drive once,
and then install it on your phone, iPad, PC and Mac like a normal app. Total setup time: about 25 minutes.

## 1. Put the app online (GitHub Pages, free) – 10 min

1. Sign in at https://github.com and click **New repository**.
   Name it `quote-desk`, choose **Private** or **Public**, click **Create repository**.
   (GitHub Pages on a private repository needs a paid GitHub plan. Public is fine: the code holds no data.
   Your quotes live only on your devices and in your Google Drive.)
2. Click **uploading an existing file**, drag in **everything inside this folder** (not the folder itself),
   then click **Commit changes**.
3. Go to **Settings → Pages**. Under *Branch*, pick `main` and `/ (root)`, click **Save**.
4. After 1–2 minutes the address appears, for example `https://dicksonpjo.github.io/quote-desk/`.
   Open it once to check the app loads.

## 2. Allow the app to use your Google Drive – 12 min

1. Open https://console.cloud.google.com and sign in with the Google account whose Drive you want to use.
2. Top bar → project picker → **New project** → name `VishwaaFX Quote Desk` → **Create**, then select it.
3. **APIs & Services → Library** → search **Google Drive API** → **Enable**.
4. **APIs & Services → OAuth consent screen** (may be called *Google Auth Platform → Branding*):
   - App name `VishwaaFX Quote Desk`, support email = your Gmail.
   - Audience **External**.
   - Under **Audience / Test users**, add your Gmail address.
   - Optional: click **Publish app** so the sign-in doesn't expire every few days.
     The app only asks for the `drive.file` permission, which Google treats as non-sensitive,
     so no review is needed.
5. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type **Web application**, name `Quote Desk`.
   - **Authorised JavaScript origins**: `https://dicksonpjo.github.io` (your GitHub address, no path).
   - **Authorised redirect URIs**: the full app address with the trailing slash,
     e.g. `https://dicksonpjo.github.io/quote-desk/`.
     The app shows the exact address to paste under *Settings → Google Drive*.
   - Click **Create** and copy the **Client ID** (ends in `.apps.googleusercontent.com`).
6. Optional: paste the Client ID into `js/config.js` and upload that file again, so every device has it
   automatically. Otherwise paste it in the app on each device (next step).

## 3. Connect and install on each device – 1 min per device

1. Open your app address.
2. **Settings (gear) → Google Drive** → paste the Client ID → **Connect Google Drive** → allow access.
3. Install it:
   - **Android (Chrome):** menu ⋮ → **Install app** / **Add to Home screen**.
   - **iPhone / iPad (Safari):** Share → **Add to Home Screen**.
   - **Windows / Mac (Chrome or Edge):** the install icon at the right of the address bar.

## What ends up in your Drive

```
My Drive / VishwaaFX Quotes /
  vishwaafx_quotes_data.json     all quotes and settings (synced between devices)
  Backups / backup_YYYY-MM-DD.json  one copy per day
  PDF / VFX-26-27-002 Law and Order / VFX-26-27-002 Law and Order.pdf
```

The app can only see files it created itself. It cannot read anything else in your Drive.

## Good to know

- **Works offline.** Edits are kept on the device and sync when the connection is back.
- **Sign-in lasts one hour at a time.** When it runs out, the app refreshes it quietly on next open.
  If the top button shows *Reconnect Drive*, tap it.
- **Same quote edited on two devices:** the most recently saved version of that quote wins.
- **Updating the app:** upload the changed files to the same GitHub repository. Phones pick up the new
  version the next time the app is opened online.
- **Malayalam or other non-Latin text** is not supported inside the PDF yet (it shows as `?`).
  English text, ₹ and Indian number format are fully supported.
