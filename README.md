# 1CARZ LIVE BOARD

> لوحة العربيات الحية — تطبيق ويب تقدّمي (PWA) لإدارة وعرض عربيات معرض 1CARZ بأولويات متعددة، بث مباشر من Firebase، ودعوة كاملة كضيف.

A complete Next.js 14 Progressive Web App for the 1CARZ car dealership priority display system.
Arabic-first (RTL), Firebase-backed, deployed on Vercel.

- **Live app:** <https://1carz-pwa.vercel.app>
- **Firebase project:** `carz-live-board`

---

## Overview

The app is split into three surfaces:

1. **Landing (`/`)** — public hero with buy / sell CTAs (anyone, no login).
2. **Live board (`/cars`)** — the priority car board, accessible to:
   - Guests (public, status `active`, `assigned_to` contains `all`).
   - Logged-in users scoped to their `assigned_to` list.
   - Marketers (مسوّق) who also get `/buyers/new` to log buyer leads with a per-day cap.
3. **Admin (`/admin/*`)** — dark-themed dashboard for owners:
   - `/admin/dashboard` — today report + priority counts + recent cars + buyers panel.
   - `/admin/cars` — list, filter, sort, and bulk-edit cars.
   - `/admin/cars/new` and `/admin/cars/[id]` — create / edit a car (up to 30 images).
   - `/admin/users` — users + groups (assign members, edit daily buyer limit, delete users).
   - `/admin/cars/[id]/error.tsx` etc. — graceful error/loading boundaries per segment.

Two supporting server routes:

- `POST /api/admin/users` — admin creates a user with username + role + daily buyer limit.
- `PATCH /api/admin/users/[uid]` — admin updates a user (role, group membership, daily limit, deletion).
- `DELETE /api/admin/users/[uid]` — admin deletes a user.

Both `POST`/`PATCH`/`DELETE` go through `lib/adminAuthServer.ts`, which uses the **Firebase Admin SDK** + a custom session cookie to verify the caller is an admin.

---

## Tech Stack

- **Next.js 14** (App Router) + **TypeScript** (strict mode)
- **Tailwind CSS** with custom theme (light public + dark admin)
- **Firebase** v10 modular SDK — Auth + Firestore + Storage (browser) + Admin SDK (server-only)
- **react-firebase-hooks** for listeners where convenient, but most live updates go through `onSnapshot` directly so we control error / loading states
- **lucide-react** for icons (no emojis in UI)
- **next/font** for Cairo (Arabic) + Inter (numbers, tabular)
- **react-firebase-hooks** is intentionally avoided in hot paths (admin dashboard, live board) — we wire `onSnapshot` directly so we can attach logger + fallback paths
- **Vercel** for hosting (fra1 region)

---

## Features

### Public / user
- 🎯 **Live priority board** — cars grouped by 5 priority tiers (`arabyatna`, `top`, `high`, `medium`, `low`).
- 👀 **Guest mode** — non-logged-in visitors can browse public cars.
- 📞 **One-tap phone copy** — every contact block has a copy button that logs the copy to `copy_events`.
- 📥 **Image gallery + Lightbox** — tap any image to open the Lightbox; navigate with arrows, swipe, or thumbs.
- 📤 **Share + download** — share via WhatsApp, download individual images or the whole album (with iOS batch fallback).
- 📝 **Buyer intake (`/buyers/new`)** — marketers log buyer leads with an atomic per-day limit enforced via a Firestore `runTransaction` + `daily_buyer_counts/{uid}/days/{cairoDate}` counter.
- 🏷️ **Featured badge** — admins mark up to a handful of cars as مميز for the home screen.
- 📱 **PWA** — installable, custom `sw.js`, offline-friendly.

### Admin
- 📊 **Dashboard** — priority counts via `getCountFromServer` (no full reads), today report (added / reserved / sold), recent 10 cars.
- 👥 **Buyers panel** — today's leads + last-30-day leads, grouped by marketer with collapsible rows.
- 🚗 **Cars CRUD** — list, filter, sort, edit (title, prices, phones, status, priority, assigned-to, featured flag).
- 🖼️ **30-image uploader** — drag/drop multiple images, auto-compress to 150–200 KB, dimension validation (200–8000 px), orphan cleanup on partial failure.
- 👤 **User management** — create users with username, role (`admin` / `inspector` / `marketer`), daily buyer limit.
- 👨‍👩‍👧 **Groups** — group users under a named cohort and assign whole groups at once.
- 🛠️ **Cars fix tool** — one-time fix that backfills legacy `assigned_to` / `status` fields.
- 🔒 **Admin session cookie** — Firebase Admin SDK issues a custom session cookie; client refreshes it transparently.

### Engineering
- 🛡️ **Firebase App Check** enabled in production (reCAPTCHA Enterprise).
- 📊 **Centralized logger** (`src/lib/logger.ts`) — debug/info no-op in prod, warn/error always logged.
- 🧹 **Type safety** — `src/types/env.d.ts` gives all `process.env.NEXT_PUBLIC_*` and server-only admin vars proper types.
- 🚀 **Debounced search** — `useDebouncedValue` (250 ms) used in admin search inputs.
- 🧠 **Memo'd `CarCard`** — `React.memo` so a Firestore update on one car doesn't re-render every card.
- 💾 **Counted reads** — priority counts and today's buyer counts use `getCountFromServer`, never `onSnapshot` on the full collection.
- 🧯 **Orphan image cleanup** — if a multi-image upload fails halfway, the URLs we already wrote to Storage are deleted.
- 📲 **Atomic daily limit** — Firestore `runTransaction` enforces the per-day marketer cap (race-safe).

---

## Local Setup

### 1. Node Version

**Use Node.js 18 LTS or Node.js 20 LTS.** Next.js 14 ships with a SWC native binary that is **not compatible with Node.js 23+** at the time of writing.

- `npm run dev` works on Node 23, but `npm run build` fails with `Unexpected end of JSON input` from SWC.
- Recommended: `nvm use 20` (see `.nvmrc` if present).

### 2. Install dependencies

```bash
npm install
```

### 3. Firebase project

You need access to the `carz-live-board` Firebase project (or your own clone):

- **Authentication** → enable Email/Password.
- **Firestore** → create the database in production mode.
- **Storage** → create the default bucket.
- **App Check** → register `reCAPTCHA Enterprise`; copy the site key.

### 4. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

Required:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Optional but recommended:

- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` — only set when App Check is enabled in production.
- `NEXT_PUBLIC_ADMIN_WHATSAPP` — the WhatsApp number used by the landing page "بيع عربية" button.

Server-only (NEVER expose to client):

- `FIREBASE_PROJECT_ID` — usually the same as `NEXT_PUBLIC_FIREBASE_PROJECT_ID`.
- `FIREBASE_CLIENT_EMAIL` — service account email from Firebase Console → Project Settings → Service Accounts.
- `FIREBASE_PRIVATE_KEY` — full service account private key, with `\n` literal escapes preserved.

> The service account JSON itself is git-ignored. On Vercel, add the same three variables under Project Settings → Environment Variables (Production).

### 5. Deploy security rules

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

The repository ships with:

- `firestore.rules` — access control for `cars`, `users`, `buyer_leads`, `daily_buyer_counts`, `copy_events`.
- `firestore.indexes.json` — composite indexes for the priority + assignment + date queries.
- `storage.rules` — read for any signed-in user, write only for admin / car form.

### 6. Promote the first admin

After signing up via the app, run locally:

```bash
node scripts/set-admin.mjs --email you@example.com
```

This writes the `role: 'admin'` field to your user doc. You'll need a service-account JSON in `scripts/serviceAccountKey.json` (git-ignored).

### 7. Run

```bash
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run build        # production build
npm run start        # serve the production build
```

---

## Deployment (Vercel)

The repo is configured for Vercel out of the box (`vercel.json`):

- **Build command:** `next build`
- **Install command:** `npm install --no-audit --no-fund --prefer-offline`
- **Region:** `fra1` (Frankfurt — closest to Egypt)
- **Rewrites:** `/sw.js`, `/manifest.json`, `/icons/*` are served from `/public`.
- **Headers:** `sw.js` and `manifest.json` are sent with `Cache-Control: no-cache` so updates propagate immediately.

### First-time setup

1. Import this repo into Vercel.
2. Add all environment variables listed above (Production scope).
3. Trigger a deployment. The first build is slow (Firebase Admin + Tailwind cold cache); subsequent ones are fast.

### Deploy a new build

```bash
npx vercel deploy --prod --force
```

`--force` bypasses Vercel's build cache (useful when a previous build failed or stale `node_modules` lingered).

### Verify the deployment

```bash
# Get the latest deployment URL
npx vercel inspect <deployment-url> --logs

# Smoke test
curl -I https://1carz-pwa.vercel.app
```

Both should show HTTP 200 and "Compiled successfully" in the inspect output.

---

## Project Structure

```
1carz-pwa/
├── public/
│   ├── sw.js                      Service worker (network-first nav, cache-first static)
│   ├── manifest.json              PWA manifest (shortcut, not WebAPK)
│   ├── icons/                     192, 512, apple-touch
│   └── favicon.{ico,png}
├── src/
│   ├── app/                       Next.js App Router
│   │   ├── page.tsx               Landing (guest hero)
│   │   ├── cars/                  Live board (guest + logged-in)
│   │   ├── car/[id]/              Car detail page + Lightbox
│   │   ├── buyers/new/            Marketer buyer intake
│   │   ├── login/                 Email/password sign-in
│   │   ├── onboarding/            Username picker
│   │   ├── admin/                 Dark dashboard
│   │   │   ├── dashboard/         Stats + recent cars + buyers
│   │   │   ├── cars/              CRUD + fix tool
│   │   │   ├── cars/new/          Create
│   │   │   ├── cars/[id]/         Edit
│   │   │   └── users/             Users + groups
│   │   ├── api/admin/users/       Server route (Admin SDK) — create/update/delete users
│   │   ├── loading.tsx            Root loading
│   │   ├── error.tsx              Root error boundary
│   │   └── globals.css            Theme tokens, .price-display (tabular nums)
│   ├── components/
│   │   ├── BrandLogo.tsx          SVG / image logo
│   │   ├── CarCard.tsx            Memoized car card (RTL, LTR phone)
│   │   ├── Lightbox.tsx           Full-screen image viewer (arrows + thumbs)
│   │   ├── CopyButton.tsx         Clipboard + copy_events tracking
│   │   ├── EmptyState.tsx         Shared empty state
│   │   ├── LoadingState.tsx       Shared loading (page / list / detail variants)
│   │   ├── PriceFilter.tsx        Min/max price chips
│   │   ├── PriorityButtons.tsx    Mobile priority pills
│   │   ├── Header.tsx             Top bar (public)
│   │   ├── AdminHeader.tsx        Top bar (admin)
│   │   ├── ConfirmDialog.tsx      Generic confirm modal + useConfirm hook
│   │   ├── StatusBadge.tsx        Car status pill (light + admin tones)
│   │   ├── Toast.tsx              Toast container
│   │   ├── ShortcutPrompt.tsx     iOS / Android "Add to Home Screen" prompt
│   │   ├── ServiceWorkerRegister.tsx
│   │   ├── AppProviders.tsx       Auth + Toast + AppProviders chain
│   │   └── admin/
│   │       ├── StatCard.tsx       KPI tile
│   │       ├── BuyersPanel.tsx    Marketer-grouped buyer list
│   │       ├── CarForm.tsx        Create/edit form (multi-image upload)
│   │       ├── GroupManager.tsx   Groups + member management
│   │       └── UserAssignmentSelector.tsx  Car → user/group assignment
│   ├── hooks/
│   │   ├── useAuth.ts             Auth + role derivation
│   │   ├── useCars.ts             Subscribe to filtered cars
│   │   ├── useDebouncedValue.ts   250ms debounce hook
│   │   ├── useShortcutPrompt.ts   "Add to Home Screen" UX
│   │   └── useToast.tsx           Toast hook
│   ├── lib/
│   │   ├── firebase.ts            Client SDK init
│   │   ├── firebaseAdmin.ts       Server SDK init (adminAuthServer.ts user)
│   │   ├── adminAuthServer.ts     Verify session cookie → admin
│   │   ├── auth.ts                Sign-in / register / onboarding
│   │   ├── cars.ts                CRUD + priority counts + bulk fix
│   │   ├── users.ts               Subscribe + role checks
│   │   ├── groups.ts              Group CRUD
│   │   ├── buyers.ts              Buyer leads + atomic daily limit
│   │   ├── copyEvents.ts          Phone-copy tracking + leaderboard
│   │   ├── storage.ts             Image upload + compression + orphan cleanup
│   │   ├── downloadCarImages.ts   Download / share helpers (iOS batch fallback)
│   │   ├── cairoDay.ts            Cairo-timezone day helpers
│   │   ├── phone.ts               Phone validation + digits-only
│   │   ├── format.ts              Price / date / digit utilities
│   │   ├── logger.ts              Centralized logger (debug/info no-op in prod)
│   │   ├── priority.ts            Priority order + labels
│   │   ├── carStatus.ts           Car status enums + meta
│   │   └── types.ts               Shared TypeScript types
│   └── types/
│       └── env.d.ts               Type-safe process.env
├── scripts/
│   ├── set-admin.mjs              Promote a user to admin
│   └── debug-firestore.mjs        Local helper
├── firestore.rules                Access control
├── firestore.indexes.json         Composite indexes
├── storage.rules                  Storage access control
├── vercel.json                    Vercel config (region + headers + rewrites)
├── firebase.json                  Firebase project config
├── .env.local.example             Env var template
├── next.config.js                 Image domains + swcMinify + experimental externals
├── tailwind.config.js             Theme tokens
└── tsconfig.json                  Strict TS, path alias @/*
```

---

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` | Production build (`.next/`) |
| `npm run build:static` | Static export for Firebase Hosting (`out/`) |
| `npm run start` | Serve the production build locally |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `next lint` (non-blocking — build ignores lint) |
| `npm run deploy` | `firebase deploy` (hosting + rules) |
| `npm run deploy:vercel` | `vercel --prod --yes` |
| `npm run clean` | Wipe `.next/`, `out/`, and `node_modules/.cache` |

---

## Architecture notes

### Live data flow

`onSnapshot` is wired directly in the relevant module (`cars.ts`, `users.ts`, `groups.ts`, `buyers.ts`, `copyEvents.ts`). Each callback goes through `logger.warn` / `logger.error` on failure and falls back to an empty array so the UI stays responsive even if a collection goes temporarily inaccessible.

### Atomic buyer cap

`addBuyerLead` uses a Firestore `runTransaction` to read `daily_buyer_counts/{uid}/days/{cairoDate}` → validate → bump the counter → create the lead doc. This is race-safe even if two tabs submit at the same instant. The transaction runs on `Timestamp.now()` (an instant in real time) — `serverTimestamp()` is intentionally not used because unresolved sentinels are not allowed inside transactions.

### Orphan-image cleanup

When `resolveCarImages` throws mid-upload (network, user nav, etc.), the URLs that were already uploaded to Storage are deleted in a `Promise.allSettled`. The caller (`useAddCar` / `useUpdateCar`) receives the partial list and can rethrow with context.

### Service worker strategy

`public/sw.js` is hand-rolled (not Workbox) to keep the bundle small:

- **Network-first** for navigation requests (HTML pages).
- **Cache-first** for static assets (`/_next/static/*`, `/icons/*`, `/favicon.ico`).
- **Stale-while-revalidate** for everything else.
- **`/_next/image`** is never intercepted — the image optimizer is always live.
- **`/manifest.json`** is sent with `cache: 'no-store'` so an old standalone copy never makes Chrome re-prompt to install.

Versioning: bump `STATIC_CACHE` + `RUNTIME_CACHE` whenever you change what gets pre-cached or how the runtime cache is keyed.

### Logging

`src/lib/logger.ts` is the single entry point. In production, `debug` and `info` are no-ops; `warn` and `error` always log so failures never silently disappear. All non-trivial errors (Firestore subscription failures, upload failures, copy_events failures, etc.) flow through `logger.warn` / `logger.error`.

### Memoization

`CarCard` is wrapped in `React.memo` so a single Firestore doc update doesn't re-render every visible card. The shallow prop comparison is sufficient because car docs are normalized once in `cars.ts` and remain reference-stable across re-subscribes.

---

## License

© 1CARZ LIVE BOARD. All rights reserved.
