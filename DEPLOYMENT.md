# 1CARZ Live Board — Deployment Guide

Two recommended paths to deploy this Next.js 14 PWA:

| Path | Time | Cost | Best for |
|------|------|------|----------|
| **Vercel** ⭐ | 5 min | Free tier | Easiest — no Node version issues, instant URL |
| **Firebase Hosting** | 15 min | Free tier | Stays inside Firebase ecosystem (needs Node 20 for build) |

---

## Path A — Vercel (Recommended) ⭐

Vercel builds Next.js projects server-side using **Node 20 LTS**, which sidesteps the Node 23 + SWC incompatibility completely.

### Option A1: One-time deploy from local machine

```bash
# 1. Install Vercel CLI globally
npm install -g vercel

# 2. Login (opens browser, sign in with GitHub)
vercel login

# 3. Deploy (from project root)
cd 1carz-pwa
vercel

# Vercel will detect Next.js automatically and ask:
#   - Set up and deploy? Yes
#   - Which scope? (your account)
#   - Link to existing project? No
#   - Project name? 1carz-live-board
#   - Directory? ./
#   - Override settings? No

# First deploy gives you a preview URL like:
#   https://1carz-live-board-<hash>.vercel.app

# Production deploy
vercel --prod
```

### Option A2: GitHub integration (auto-deploy on push)

1. Push the project to a new GitHub repo:
   ```bash
   cd 1carz-pwa
   git init
   git add .
   git commit -m "feat: initial 1carz live board pwa"
   gh repo create 1carz-live-board --public --source=. --push
   ```
2. Go to [vercel.com/new](https://vercel.com/new)
3. Click **"Import Git Repository"** → select `1carz-live-board`
4. Vercel auto-detects Next.js — leave all defaults → click **Deploy**
5. Live in ~90 seconds. URL: `https://1carz-live-board.vercel.app`

### Environment variables for Vercel

Add these in Vercel dashboard → Project → Settings → Environment Variables:

| Key | Value | Notes |
|-----|-------|-------|
| `NEXT_PUBLIC_ADMIN_WHATSAPP` | `201234567890` | For the "تواصل عبر واتساب" button |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | (from Firebase Console) | Required — see `.env.local.example` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | (from Firebase Console) | Required |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | (from Firebase Console) | Required |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | (from Firebase Console) | Required |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | (from Firebase Console) | Required |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | (from Firebase Console) | Required |
| `FIREBASE_PROJECT_ID` | (from Service Account JSON) | Required (Admin SDK) |
| `FIREBASE_CLIENT_EMAIL` | (from Service Account JSON) | Required (Admin SDK) |
| `FIREBASE_PRIVATE_KEY` | (from Service Account JSON) | Required (Admin SDK) |

The full list of required env vars is documented in `.env.local.example` — copy that file to `.env.local` and fill in the values from your Firebase Console. **Do not commit `.env.local`** — it's in `.gitignore`.

---

## Path B — Firebase Hosting (with Node 20)

### Step 1: Switch to Node 20 LTS

The Node 23 + Next.js 14 SWC issue is a hard incompatibility. The build cannot complete on Node 23, so we need to switch.

#### Option 1: NVM (best)

```bash
# Install nvm-windows if you don't have it
# https://github.com/coreybutler/nvm-windows/releases

nvm install 20
nvm use 20

# Verify
node --version  # should show v20.x.x
```

#### Option 2: Direct install

Download Node 20 LTS from https://nodejs.org/dist/latest-v20.x/

### Step 2: Enable static export in next.config.js

Add `output: 'export'` to your next.config.js — this produces a static `out/` folder that Firebase Hosting can serve directly.

```js
// next.config.js
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  // ... existing config
};
module.exports = nextConfig;
```

### Step 3: Build

```bash
cd 1carz-pwa
npm install
npm run build
```

This creates `out/` with all static files.

### Step 4: Configure firebase.json

The repo's `firebase.json` is already set up to serve `out/` as a Firebase Hosting site:

```json
{
  "hosting": {
    "public": "out",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  },
  "firestore": { "rules": "firestore.rules" },
  "storage": { "rules": "storage.rules" }
}
```

### Step 5: Deploy

```bash
firebase login
firebase use --add  # pick carz-live-board
firebase deploy --only hosting,firestore:rules,storage
```

Live URL: `https://carz-live-board.web.app`

---

## After Deploy — Seed the test accounts

1. **Get service account key** (one-time, 2 min):
   - Firebase Console → Project Settings → Service Accounts → Generate New Private Key
   - Save as: `scripts/serviceAccountKey.json`

2. **Run the seed script**:
   ```bash
   cd 1carz-pwa
   node scripts/seed-firebase-users.mjs
   ```

3. **Sign in as admin**:
   - Email: `admin1@1carz.com`
   - Password: `Admin@2026`
   - ⚠ First time: sign out + sign back in for the admin custom claim to take effect

4. **Sign in as user**:
   - Email: `user001@1carz.com`
   - Password: `User@2026`
   - You'll go through onboarding (pick your username) once

---

## Custom domain (optional)

### Vercel
- Project → Settings → Domains → Add `cars.example.com`
- Update DNS at your registrar (CNAME → cname.vercel-dns.com)

### Firebase Hosting
- Firebase Console → Hosting → Add custom domain
- Add the DNS A records Firebase provides

---

## Local testing without deploying

```bash
cd 1carz-pwa
npm run dev
# → http://localhost:3000
```

Works on Node 23 (only `npm run build` is broken, dev server is fine).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `npm run build` fails with "Unexpected end of JSON input" | Switch to Node 20 (Path B, Step 1) |
| Vercel build fails | Check Vercel build logs; usually missing env vars |
| Admin can't see dashboard | Sign out, sign back in (refresh custom claim) |
| User can't see any cars | Check that admin has added cars + assigned them |
| "Permission denied" on Firestore | Re-deploy rules: `firebase deploy --only firestore:rules,storage` |
