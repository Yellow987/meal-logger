# Last Meal

A tiny phone web app (PWA) to log your **last meal time** — one big button for
"Ate now", an editable time, and a live fasting timer — that pushes each day's
last-meal time into your Google Sheet.

No app store, no native build. Open the link on your phone and **Add to Home
Screen**; it then behaves like an app and works offline. Updates are instant:
when I change the code and redeploy, your phone picks it up on next open.

## Architecture

- **The app** (`index.html` + `manifest` + `sw.js`) — hosted on GitHub Pages.
  Saves the time in the browser immediately (localStorage), then POSTs it to…
- **A Google Apps Script web app** (`apps-script/Code.gs`) bound to your sheet,
  which upserts one row per day into a **Meals** tab (`Date | Last meal | Updated`).
  This avoids putting any Google credentials in the app.

## Setup (one time)

### 1. Deploy the sheet endpoint

1. Open your Google Sheet → **Extensions → Apps Script**.
2. Delete the starter code, paste the contents of [`apps-script/Code.gs`](apps-script/Code.gs), and save.
3. **Deploy → New deployment → Web app.**
   - Execute as: **Me**
   - Who has access: **Anyone**  ← required so the app can post without a login.
4. Authorize when prompted. Copy the **Web app URL** (ends in `/exec`).

> The URL is effectively a write key to a "Meals" tab. Anyone who had it could
> add meal-time rows — low stakes for a personal sheet, but don't post it publicly.

### 2. Point the app at your sheet

1. Open the app link on your phone (see below) → **Add to Home Screen**.
2. Open it → **Sheet sync settings** → paste the `/exec` URL → **Save URL**.

That's it. Tap **Ate now** (or edit the time) and it lands in your sheet.

## App link

GitHub Pages: _added after first deploy_ → `https://yellow987.github.io/meal-logger/`

## Dev

Static files; no build. Edit, commit, push → GitHub Pages serves the update and
the phone picks it up next open. Bump `CACHE` in `sw.js` when you change assets.
