# SugarSisters Blend Traceability PWA — Setup Guide

## What this is
A phone app for your operatives that walks them step-by-step through making a blend, captures every ingredient weight and supplier lot number (with barcode scanning), and pushes a real-time notification to your phone the moment a batch is submitted.

It runs in the browser but installs to the home screen exactly like a native app — no App Store, no Play Store, no developer accounts, no subscription fees.

---

## Files
| File | Purpose |
|---|---|
| `index.html` | The entire PWA — single self-contained file |
| `apps_script.gs` | Google Apps Script that receives batches and writes them to your Sheet + emails you |

---

## Step 1 — Host the app (free, ~5 minutes)

Use GitHub Pages, same as your Range Rover diagnostics PWA.

1. Log into github.com as `sugarsisters2026` (or any account you own).
2. Create a new public repository: name it `blend-traceability`.
3. Upload `index.html` to the root of the repo.
4. Settings → Pages → Source: `Deploy from a branch` → Branch: `main` → Folder: `/ (root)` → Save.
5. After ~1 minute the app is live at:
   `https://sugarsisters2026.github.io/blend-traceability/`

To edit recipes later: edit `index.html` on GitHub (pencil icon) — changes go live in ~30 seconds.

---

## Step 2 — Install on workers' phones

### iPhone
1. Open the URL above in Safari.
2. Tap the Share icon → **Add to Home Screen** → Add.
3. Open the new "SS Blend" icon — it runs full-screen, no browser bars.

### Android
1. Open the URL in Chrome.
2. A banner appears: *Install app*. Tap it. (If not, menu → *Install app*.)
3. The icon lands on the home screen.

Each operative signs in once with their name. After that, the app remembers them.

---

## Step 3 — Set up Telegram notifications (5 minutes)

You'll get a message on your phone every time a batch is submitted, like:
> ✅ *Batch B2026-0042*
> *Frozen Ice 400g*
> Operator: Mary O'Brien
> Bags produced: 36 (expected 36)
> Variance: 0.12% — *OK*

### Create the bot
1. On your phone, open Telegram and search for `@BotFather`.
2. Send `/newbot`. Pick a name (e.g. *SugarSisters Production*) and a username ending in `bot` (e.g. `sugarsisters_prod_bot`).
3. BotFather replies with a **bot token** that looks like `7891234567:AAFgH...`. Save it.

### Get your chat ID
1. Search for your new bot in Telegram and send it any message (e.g. "hi").
2. In a browser, visit:
   `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
3. Find `"chat":{"id":123456789` — that number is your chat ID. Save it.

### Configure the app
1. Open the PWA on your phone.
2. **Double-tap the gold "SS" logo** in the header (or long-press it).
3. Paste in the bot token, then the chat ID, then leave the email field blank for now.
4. Submit a test batch — your phone should buzz within 2 seconds.

### Group chat option
Want notifications to a shared group (you + spouse + supervisor)?
1. Create a Telegram group, add the bot to it.
2. Send a message in the group.
3. Visit `getUpdates` again — the chat ID will now be a negative number like `-1001234567890`. Use that instead.

---

## Step 4 — Set up email + Google Sheet writing (10 minutes)

This connects each submitted batch to your existing `SugarSisters_Traceability.xlsx` workbook (uploaded as a Google Sheet) AND sends you an email.

1. Open your Google Sheet version of the traceability workbook.
2. Extensions → Apps Script.
3. Delete the default code, paste in `apps_script.gs` (provided alongside this file).
4. Edit the top of the script: set `EMAIL_TO` to your address.
5. Save.
6. Deploy → New deployment → Type: *Web app* → Execute as: *Me* → Who has access: *Anyone*. Click Deploy.
7. Copy the **Web app URL** (looks like `https://script.google.com/macros/s/AKfy.../exec`).
8. In the PWA, double-tap the SS logo and paste this URL into the third field.

From now on every submitted batch will:
- Append a row to the Batch Log tab in your Sheet
- Email you a copy
- Telegram you a copy

---

## How operatives use it (training, ~2 minutes per worker)

1. Open the SS Blend icon on the phone.
2. Tap their blend (e.g. *Frozen Ice 400g*). The app generates a fresh batch number like `B2026-0042`.
3. Tap *Begin weighing*.
4. App shows ingredient 1: **Icing Sugar — 13,600 g target**.
5. Worker weighs it on the scale, types the actual weight, taps the camera icon to scan the supplier bag's barcode (or types the lot number).
6. Live variance feedback: green ✓ within 1%, amber ⚠ slight, red ✕ out of tolerance.
7. *Confirm and continue* — app moves to ingredient 2. **Cannot skip steps.**
8. Repeat for each ingredient.
9. Final screen: enter bags produced + best-before date.
10. Review screen shows the full batch summary and a banner: *All checks passed* / *Slight variance — review* / *Variance over 2.5% — possible missed ingredient*.
11. *Submit* → notifications fire to your phone, batch saved.

---

## Adding new blends

Open `index.html` on GitHub, find the `RECIPES` array near the top of the script section. Add a new entry:

```javascript
{
  name: "Vanilla Buttercream Mix 800g",
  bagSize: 800,
  bagsPerBatch: 18,
  ingredients: [
    { name: "Icing Sugar",       grams: 12800 },
    { name: "Butter Powder",     grams: 1440  },
    { name: "Vanilla Powder",    grams: 160   },
  ],
},
```

Save → live in 30 seconds → operatives see the new blend on the home screen.

---

## Adding new ingredients

When you reference a new ingredient name in a recipe, also add it to `DEFAULT_STOCK` so opening stock is set:

```javascript
const DEFAULT_STOCK = {
  // ...
  "Butter Powder": { opening: 50000, unit: "g" },
};
```

Or set it from the app: Stock tab → *Reset / adjust stock…*

---

## Data and offline

- Every batch is stored in the phone's local storage as a backup.
- If WiFi drops mid-shift, batches still submit successfully on-device. The Telegram/email notifications retry once connection returns (browser dependent — for guaranteed delivery rely on the Apps Script Sheet write, which retries).
- Export all batches as CSV from the Done screen ("Download all batches").

---

## Troubleshooting

**Telegram message didn't arrive**
- Make sure you've sent the bot at least one message before fetching the chat ID.
- Test the token in a browser: `https://api.telegram.org/bot<TOKEN>/getMe` should return your bot info.

**Barcode scanner doesn't open**
- Some older Android browsers don't support the BarcodeDetector API. The app falls back to manual lot entry.
- iOS 17+ supports it natively. iOS 16 and earlier — workers type the lot number.

**App seems to lose data**
- Each phone stores its own copy. The single source of truth is your Google Sheet (via Apps Script). Always set up the Sheet integration so operatives' phones aren't your only record.
