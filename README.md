# Simple Macros

A simple, high-protein-focused macro tracker and meal planner for iPhone, built with Expo.

## Features

- **Macro tracking** — log food and see calories/protein/carbs/fat vs your daily goals, with 7‑day, month, and year graphs.
- **AI meal planning from photos** — photograph what's in your fridge/pantry and Claude builds a simple, high‑protein 7‑day meal plan around it.
- **Weekly reminders** — a local notification on the day/time you choose, plus an immediate notification whenever your plan is regenerated.
- **A starter meal library** — even without AI set up, the Plan tab auto-fills a week of simple, high-protein meals from a built-in library.

The whole app is intentionally minimal: 4 tabs, no clutter, no accounts or sign-in.

## Requirements

- Node.js 20+
- An iPhone with the **Expo Go** app installed (from the App Store), or a Mac + Xcode for a full native build
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

## How each feature works

- **Macro calculator**: `app/(tabs)/index.tsx` (Today) logs food against a small built-in food database (`lib/foods.ts`) or custom entries; `lib/macros.ts` does the per-gram math.
- **Graphs**: `app/(tabs)/progress.tsx` aggregates your log (`lib/aggregate.ts`) into 7‑day, 30‑day, and 12‑month views, rendered with lightweight custom SVG charts (`components/BarTrendChart.tsx`, `components/LineTrendChart.tsx`) — no heavy charting dependency.
- **AI photo → meal plan**: `app/scan.tsx` takes photos with `expo-image-picker`, sends them to `app/api/identify-ingredients+api.ts` (Claude vision → ingredient list), then `app/api/generate-meal-plan+api.ts` (Claude → a full 7‑day, high-protein plan). The plan is saved locally and replaces the current week in the Plan tab.
- **Notifications**: `lib/notifications.ts` schedules a weekly local reminder (`expo-notifications`) and fires an immediate one whenever a new AI plan is generated. Configure the day/time in Settings.
- **Data storage**: everything is local, in a SQLite database on your phone (`expo-sqlite`, schema in `lib/db.ts`). There's no backend/account — your data stays on your device.

## Project structure

```
app/
  (tabs)/          Today, Plan, Progress, Settings
  add-food.tsx     Log-food modal (search + custom entry)
  scan.tsx         AI ingredient photo → meal plan flow
  meal/[id].tsx    Meal detail (ingredients + steps)
  api/             Server-side routes (Claude calls, never bundled to client)
lib/                Data layer, theming, macro math, notifications
components/         Reusable UI (charts, cards, buttons, macro rings)
```

## Building a real installable app (optional)

Running via Expo Go is the fastest way to use this day-to-day. If you'd rather have it as a standalone app icon on your home screen (no Expo Go required), look into [EAS Build](https://docs.expo.dev/build/introduction/) for a free development or ad-hoc build you can install via TestFlight — that's a separate step from anything in this repo and requires an Apple ID.
