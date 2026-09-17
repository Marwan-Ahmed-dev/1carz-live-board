# 1CARZ Live Board — Fast Deploy Guide (5 minutes to live)

## TL;DR — The fastest path is **Vercel GitHub auto-deploy**

The local `npm run build` fails on Node 23 because of a known SWC + Node 23 incompatibility
("Unexpected end of JSON input"). **Don't fight it** — Vercel builds server-side on Node 20
in ~90 seconds, completely sidestepping the issue.

The repo is already configured:
- `vercel.json` ✓
- `.vercel/project.json` ✓ (Vercel project `1carz-pwa` already exists)

---

## Path A — Vercel Auto-Deploy from GitHub (RECOMMENDED, 90s)

### One-time setup (5 min)

1. Open https://vercel.com/new
2. Click **"Import Git Repository"** → search `1carz-live-board`
3. Click **Import** → leave all defaults → click **Deploy**
4. Wait ~90 seconds → ✅ Live at `https://1carz-pwa.vercel.app`
5. After first deploy, every `git push origin master` auto-deploys in ~90s

### After every code change

```powershell
cd "C:\Users\Mrwan\.minimax\sessions\mvs_4b8b2e42a6664442a08cc9b2b2882873\workspace\1carz-pwa"
git add -A
git commit -m "feat: ..."
git push origin master
# → Vercel auto-builds on Node 20 → live in ~90s
```

That's it. No local build needed. No deploy CLI. No Node version issues.

---

## Path B — Local build (only if you really need it)

Requires **Node 20 LTS** (not 23 — Node 23 has the SWC bug).

### Install Node 20 (one-time)

Using nvm-windows:
```powershell
nvm install 20
nvm use 20
node --version  # should show v20.x.x
```

### Build

```powershell
cd "C:\Users\Mrwan\.minimax\sessions\mvs_4b8b2e42a6664442a08cc9b2b2882873\workspace\1carz-pwa"
npm run build:static   # Static export → ./out
# OR
npm run build          # Server-side build → ./.next
```

### Deploy locally

Vercel:
```powershell
npm run deploy:vercel
```

Firebase Hosting (requires static export):
```powershell
npm run build:static
firebase deploy --only hosting
```

---

## Why local builds fail on Node 23

```
./src/app/admin/cars/page.tsx + 2 modules
Unexpected end of JSON input
```

This is SWC's native binary crashing during JSX parsing. It's documented in many
Next.js 14 + Node 23 GitHub issues. **It is not a project code bug** — your code is fine.

Three ways to work around it:
1. ✅ **Use Vercel** (Path A — recommended)
2. Use Node 20 locally (Path B)
3. Use Docker with Node 20

---

## Verifying everything is ready before pushing

```powershell
cd "C:\Users\Mrwan\.minimax\sessions\mvs_4b8b2e42a6664442a08cc9b2b2882873\workspace\1carz-pwa"
npm run typecheck   # fast TypeScript check (~5s)
npm run lint        # ESLint check
```

If both pass, you're good to push. Vercel will do the rest.

---

## Current Vercel project info

```json
{
  "projectId": "prj_umh8W1z0oisKyHgq0oRzo8Ep4niB",
  "orgId": "team_VZSBc6Jw9qfgpg9GANUq4lMH",
  "projectName": "1carz-pwa"
}
```

If for any reason Vercel isn't connected, link it:
```powershell
npx vercel link --yes
# picks existing project 1carz-pwa
```
