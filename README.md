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

**Not deployed anywhere yet** — this only runs locally (`npx expo start --web`) until you decide where to host it. A few things to know before you do:

- **Storage is per-browser.** Your food log lives in the browser's local storage, not in the cloud. iOS Safari can clear that storage if you don't open the app for a while (Apple's anti-tracking policy) — use **Settings → Backup & restore** to download a JSON backup periodically, and to restore one if that ever happens.
- **Weekly reminders don't work on web** (yet). There's no browser equivalent of a native scheduled notification without a server sending a real push notification at the right time — that only makes sense once this is hosted somewhere persistent. In the meantime, the app shows an in-app banner on the Today screen when your meal plan is still on the unpersonalized starter plan, as a lighter-weight nudge.
- **Two response headers are required** wherever this ends up hosted: `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. The local data storage (`expo-sqlite`'s web backend) needs these to work in the browser at all — `metro.config.js` already sets them for local dev; most hosts (Cloudflare Pages, Vercel, Netlify, etc.) let you set custom response headers via a config file.
- **The AI/barcode server routes** (`app/api/*`) need to run somewhere live once deployed — they can't just be static files. Options include EAS Hosting or any Node-capable host; a lighter-weight alternative is moving just those routes to a serverless platform's free tier (e.g. Cloudflare Workers) if you want to avoid EAS/Apple costs entirely, since the web path doesn't need Apple's involvement at all.

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

## Getting this onto your phone permanently (optional)

Two ways to get a "real" app icon instead of running the dev server each time:

- **Web (free)**: deploy the web build (see above) anywhere that supports the required response headers, then "Add to Home Screen" in Safari. No App Store account needed.
- **Native (costs $99/year)**: [EAS Build](https://docs.expo.dev/build/introduction/) for a development or ad-hoc build installed via TestFlight. Requires enrolling in Apple's Developer Program — that's Apple's fee for installing anything outside Expo Go/the App Store, not something specific to this project.
