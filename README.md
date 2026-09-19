# 1CARZ LIVE BOARD

A complete Next.js 14 Progressive Web App for car dealership priority display system.

## Features

- **User PWA** (Light theme, RTL Arabic) — login, see cars in 4 priority categories, installable
- **Admin Dashboard** (Dark theme, RTL Arabic) — CRUD cars, assign to users, statistics
- **Real-time sync** via Firebase Firestore — changes appear instantly across all clients
- **PWA installable** — works offline, install to home screen
- **Arabic UI throughout** with Cairo font, Inter for numbers

## Tech Stack

- **Next.js 14** (App Router) + **TypeScript** (strict mode)
- **Tailwind CSS** with custom theme (light + dark admin)
- **Firebase** v10 modular SDK (Auth + Firestore + Storage)
- **react-firebase-hooks** for listeners
- **lucide-react** for icons (no emojis)
- **next/font** for Cairo + Inter

## Quick Start

### Node Version Requirement

**Use Node.js 18 LTS or Node.js 20 LTS.** Next.js 14 ships with a SWC native binary that is **not compatible with Node.js 23+** at the time of writing. The dev server (`npm run dev`) works on Node 23, but `npm run build` will fail with `Unexpected end of JSON input` from SWC. If you have Node 23, switch with `nvm use 20` or install Node 20 LTS.

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Firebase

Copy `.env.local.example` to `.env.local` and fill in the values from your Firebase Console → Project Settings → General → Your apps (web app config). The same values are documented in `src/lib/firebase.ts`.

#### Enable Firebase services

In the [Firebase Console](https://console.firebase.google.com/project/carz-live-board):

1. **Authentication → Sign-in method** → Enable **Email/Password**
2. **Firestore Database** → Create database → Production mode → Region: **eur3 (europe-west)**
3. **Storage** → Get started → Production mode → Region: **eur3**

#### Deploy Security Rules

```bash
# Install Firebase CLI (one time)
npm install -g firebase-tools

# Login
firebase login

# Initialize (one time, only if not done already)
firebase use --add  # select carz-live-board

# Deploy rules
firebase deploy --only firestore:rules,storage
```

#### Create your first user

In **Firebase Console → Authentication → Users → Add User**, create:
- Email: `admin@example.com`
- Password: (your choice, 6+ chars)

Then promote to admin (see below).

### 3. Promote a user to admin

Get your service account key:

1. Firebase Console → Project Settings → **Service Accounts** tab
2. Click **"Generate New Private Key"** → saves a JSON file
3. Save it as `scripts/serviceAccountKey.json`

Then run:

```bash
node scripts/set-admin.js admin@example.com
```

The user must sign out and sign back in for the admin claim to take effect.

### 4. Configure WhatsApp number (optional)

For the "تواصل عبر واتساب" button on car detail pages, edit `.env.local`:

```bash
cp .env.local.example .env.local
# Edit NEXT_PUBLIC_ADMIN_WHATSAPP=201234567890
```

### 5. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Production build

```bash
npm run build
npm run start
```

## Project Structure

```
1carz-pwa/
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service worker
│   ├── icons/                  # PWA icons (192/512)
│   └── favicon.ico
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout (fonts, RTL, ToastProvider)
│   │   ├── page.tsx            # LIVE BOARD (home)
│   │   ├── login/              # Auth
│   │   ├── onboarding/         # Username selection
│   │   ├── 3arabyatna/         # My Cars
│   │   ├── car/[id]/           # Car detail
│   │   └── admin/              # Admin Dashboard
│   ├── components/             # Shared UI
│   │   ├── Header.tsx
│   │   ├── PriorityButtons.tsx
│   │   ├── CarCard.tsx
│   │   ├── PriceFilter.tsx
│   │   ├── InstallPrompt.tsx
│   │   ├── EmptyState.tsx
│   │   ├── LoadingState.tsx
│   │   └── admin/              # Admin-specific
│   ├── lib/
│   │   ├── firebase.ts         # Firebase init
│   │   ├── auth.ts             # Auth helpers
│   │   ├── cars.ts             # Cars CRUD + realtime
│   │   ├── users.ts            # Users queries
│   │   ├── storage.ts          # Image upload
│   │   └── types.ts            # TypeScript types
│   ├── hooks/
│   │   ├── useAuth.ts          # Auth state
│   │   ├── useCars.ts          # Realtime cars + filter
│   │   ├── useInstallPrompt.ts # PWA install
│   │   └── useToast.ts         # Toast provider
│   └── middleware.ts           # Route protection
├── firestore.rules             # Firestore security rules
├── storage.rules               # Storage security rules
├── firebase.json               # Firebase config
├── tailwind.config.ts          # Custom theme
└── scripts/
    └── set-admin.js            # Admin role script
```

## Authentication Flow

1. User visits `/` → if not logged in, redirected to `/login`
2. After login:
   - If `username === null` → redirected to `/onboarding`
   - If admin → can access `/admin/*`
   - Otherwise → home page
3. Onboarding: pick a username (3-20 chars, Arabic or English, unique) → save to Firestore → PWA install prompt

## Data Model

### `users/{uid}` documents

```typescript
{
  uid: string;
  email: string;
  username: string | null;    // null until onboarding complete
  onboarded_at: Timestamp | null;
  created_at: Timestamp;
  last_seen: Timestamp;
}
```

### `cars/{carId}` documents

```typescript
{
  code: string;
  title: string;
  price: number;
  description: string;
  priority: 'top' | 'high' | 'medium' | 'low';
  display_order: number;
  status: 'active' | 'inactive' | 'reserved' | 'sold';
  image_url: string;
  condition: 'new' | 'used' | 'excellent' | 'good';
  is_featured: boolean;
  assigned_to: string[];     // ['all'] OR ['username1', 'username2']
  created_at: Timestamp;
  updated_at: Timestamp;
}
```

## Security

- **Firestore Rules** enforce that users can only read active cars assigned to them or `all`. Admins can read/write everything.
- **Storage Rules** allow public reads of car images but only admins can write.
- **Admin role** is stored as a Firebase Auth **custom claim** (`role: 'admin'`). Set via `scripts/set-admin.js`.

## Routes

### Public (after auth)
- `/login` — email/password
- `/onboarding` — first-time username
- `/` — LIVE BOARD (all cars in 4 priority sections)
- `/3arabyatna` — My Cars (assigned only)
- `/car/[id]` — car detail with WhatsApp CTA

### Admin (`role: admin`)
- `/admin/dashboard` — stats + recent cars
- `/admin/cars` — list + search + filter + delete
- `/admin/cars/new` — add car
- `/admin/cars/[id]` — edit car
- `/admin/users` — user list + click for assigned cars

## PWA Install

After onboarding, an install prompt appears automatically:

- **Android/Desktop**: Shows native install button
- **iOS**: Shows instructions for "Add to Home Screen"

The prompt dismisses after 2 refusals (stored in localStorage).

## Deployment

### Firebase Hosting (recommended)

```bash
# Add to package.json scripts: "deploy:hosting": "next build && firebase deploy --only hosting"
npm run build
firebase deploy --only hosting,firestore:rules,storage
```

Or use Vercel:

```bash
npm install -g vercel
vercel
```

## License

© 1CARZ LIVE BOARD. All rights reserved.