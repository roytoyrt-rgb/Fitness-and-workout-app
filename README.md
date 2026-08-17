# Simple Macros

A simple, high-protein-focused macro tracker and meal planner, built with Expo. Runs as an iPhone app (Expo Go / native build) or as a web app you can install to your home screen ("Add to Home Screen" in Safari) — same codebase, same features, no App Store account needed for the web version.

## Features

- **Macro tracking** — log food and see calories/protein/carbs/fat vs your daily goals, with 7‑day, month, and year graphs.
- **Barcode scanning** — scan a product's barcode, get its macros from a free product database, and see calories/macros scale live as you change the grams (plus a flat kcal-per-gram figure so you can compare density between products regardless of portion). Unrecognized products can be entered manually once and are remembered by barcode for next time.
- **Copy a previous day** — reuse a day's food log (from last week or further back) instead of re-entering it, with the option to uncheck anything you don't want to repeat.
- **AI meal planning from photos** — photograph what's in your fridge/pantry and Claude builds a simple, high‑protein 7‑day meal plan around it.
- **Weekly reminders** — a local notification on the day/time you choose, plus an immediate notification whenever your plan is regenerated.
- **A starter meal library** — even without AI set up, the Plan tab auto-fills a week of simple, high-protein meals from a built-in library.

The whole app is intentionally minimal: 4 tabs, no clutter, no accounts or sign-in.

## Requirements

- Node.js 20+
- Either an iPhone with the **Expo Go** app installed (from the App Store), or just a web browser (no phone app needed) — see "Or run it as a web app" below
- (Optional, for AI meal scanning) an [Anthropic API key](https://console.anthropic.com/settings/keys) — a normal debit card works fine for billing

## Setup

```bash
npm install
```

### Enable AI meal scanning (optional but recommended)

1. Create an API key at https://console.anthropic.com/settings/keys
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Paste your key into `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
4. Restart the dev server after adding/changing `.env`.

Without a key, everything still works except the "Scan ingredients" feature — the Plan tab falls back to the built-in simple, high-protein meal library, and Settings will show "AI meal scanning: Not set up" with a reminder of these steps.

**Your key never ships to the phone.** It's read by the server-side API routes in `app/api/` (which run on your dev machine), not by the client app — that's why the app runs Expo Router's built-in API-route server rather than calling Anthropic directly from the phone.

### Run it

```bash
npx expo start
```

Scan the QR code with your iPhone's camera (it'll open in Expo Go), or press `i` to open an iOS simulator if you're on a Mac with Xcode installed.

### Or run it as a web app

```bash
npx expo start --web
```

Open the printed `http://localhost:8081` URL. On an iPhone, open that URL in Safari, tap Share → **Add to Home Screen**, and it behaves like an installed app (full-screen, its own icon, no browser chrome).

A few things worth knowing about the web version specifically:

- **Storage is per-browser.** Your food log lives in the browser's local storage, not in the cloud. iOS Safari can clear that storage if you don't open the app for a while (Apple's anti-tracking policy) — use **Settings → Backup & restore** to download a JSON backup periodically, and to restore one if that ever happens.
- **Weekly reminders don't work on web** (yet). There's no browser equivalent of a native scheduled notification without a server sending a real push notification at the right time. In the meantime, the app shows an in-app banner on the Today screen when your meal plan is still on the unpersonalized starter plan, as a lighter-weight nudge that needs no server.

## Deploying the web version (free)

`server.js` is a small, self-contained Node server that serves the exported web build (`npm run build`) — it only uses Node's built-ins, so it runs on **any** plain Node host, not tied to one platform's proprietary format. `render.yaml` is a ready-to-go config for [Render](https://render.com), whose free tier doesn't require a credit card (worth double-checking at signup in case that's changed):

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. At [render.com](https://render.com), sign up free, then **New +** → **Blueprint**, and point it at this repo. Render will detect `render.yaml` and pre-fill everything (build command, start command, free plan).
3. It'll prompt you for `ANTHROPIC_API_KEY` — paste yours in if you want AI meal scanning live, or leave it blank (everything else still works; AI scanning just stays "Not set up").
4. Click deploy. You'll get a `https://simple-macros-xxxx.onrender.com` URL — open that in Safari on your iPhone and **Add to Home Screen**.

**Free-tier tradeoff to expect**: Render's free web services sleep after 15 minutes of no traffic and take ~30-60 seconds to wake up on the next request. Normal for free hosting, just don't be surprised by a slow first load.

Two verification notes: the production server (`server.js`) has been tested locally end-to-end — every route, the API routes, and the required security headers all confirmed working exactly as they will once deployed. What hasn't been (and can't be, from here) verified is the live Render deployment itself, since account creation and GitHub authorization are steps only you can complete — if anything looks off on the live URL, tell me what you're seeing and I'll fix it.

## How each feature works

- **Macro calculator**: `app/(tabs)/index.tsx` (Today) logs food against a small built-in food database (`lib/foods.ts`) or custom entries; `lib/macros.ts` does the per-gram math.
- **Barcode scanning**: `app/barcode.tsx` uses `expo-camera`'s barcode scanner (EAN-13/8, UPC-A/E, Code128). It first checks your local food database for that barcode (instant, works offline for repeat scans), then falls back to `app/api/barcode+api.ts`, which looks the product up on [Open Food Facts](https://world.openfoodfacts.org) (free, no API key) and caches the result locally by barcode. Grams entered scale the macros live; a kcal/g figure is shown alongside so the "intensity" is visible independent of portion size.
- **Copy a previous day**: `app/copy-day.tsx` lists past days that have logged food (via `getRecentLogDates` in `lib/queries.ts`), lets you review/uncheck individual items, then duplicates the checked entries into today with `copyLogEntries`.
- **Graphs**: `app/(tabs)/progress.tsx` aggregates your log (`lib/aggregate.ts`) into 7‑day, 30‑day, and 12‑month views, rendered with lightweight custom SVG charts (`components/BarTrendChart.tsx`, `components/LineTrendChart.tsx`) — no heavy charting dependency.
- **AI photo → meal plan**: `app/scan.tsx` takes photos with `expo-image-picker`, sends them to `app/api/identify-ingredients+api.ts` (Claude vision → ingredient list), then `app/api/generate-meal-plan+api.ts` (Claude → a full 7‑day, high-protein plan). The plan is saved locally and replaces the current week in the Plan tab.
- **Notifications**: `lib/notifications.ts` schedules a weekly local reminder (`expo-notifications`) and fires an immediate one whenever a new AI plan is generated. Configure the day/time in Settings.
- **Data storage**: everything is local, in a SQLite database on your phone (`expo-sqlite`, schema in `lib/db.ts`). There's no backend/account — your data stays on your device.

## Project structure

```
app/
  +html.tsx        Web-only root HTML document (PWA manifest, iOS meta tags)
  (tabs)/          Today, Plan, Progress, Settings
  add-food.tsx     Log-food modal (search + custom entry)
  barcode.tsx      Barcode scan → macro lookup → log flow
  copy-day.tsx     Copy a previous day's log into today
  scan.tsx         AI ingredient photo → meal plan flow
  meal/[id].tsx    Meal detail (ingredients + steps)
  api/             Server-side routes (Claude calls, never bundled to client)
lib/                Data layer, theming, macro math, notifications, backup
components/         Reusable UI (charts, cards, buttons, macro rings)
public/             Static web assets (PWA manifest + icons)
```

## Getting this onto your phone permanently

The web deployment above (free) plus "Add to Home Screen" is the no-cost way to get a permanent app icon. The alternative is a true native app via [EAS Build](https://docs.expo.dev/build/introduction/) + TestFlight, which requires enrolling in Apple's Developer Program ($99/year, Apple's fee for installing outside Expo Go/the App Store — not specific to this project).
