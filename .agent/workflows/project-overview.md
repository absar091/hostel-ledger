---
description: Hostel Ledger project overview, architecture, and key conventions
---

# Hostel Ledger — Project Memories

## What It Is

A smart expense splitting app for hostel roommates & friend groups. React + Firebase PWA with Node.js backend.

## Tech Stack

- **Frontend:** React 18 + TypeScript, Vite, TailwindCSS, Radix UI, ShadCN
- **Backend:** Node.js + Express (`backend-server/server.js` — single file, ~2900 lines)
- **Database:** Firebase Realtime Database (NOT Firestore)
- **Auth:** Firebase Authentication (Email/Password)
- **Push Notifications:** OneSignal (replaced old VAPID/FCM approach)
- **Email:** Nodemailer with Zoho Mail (primary) + Gmail SMTP (fallback)
- **PWA:** vite-plugin-pwa with injectManifest strategy
- **Hosting:** Vercel (frontend) + separate backend server

## Key Architecture Decisions

- **Service Worker:** Single unified SW at `src/OneSignalSDKWorker.ts` handles BOTH OneSignal push AND Workbox caching
- **Email Fallback:** `sendMailWithFallback()` in server.js tries Zoho first, auto-retries via Gmail on quota errors
- **Settlements:** Bidirectional debts — NO auto-netting. Users must explicitly record payments
- **Real-time Data:** `FirebaseAuthContext.tsx` uses `onValue` listeners (NOT one-time `get`) for user profile/settlements
- **`group.members`:** Always convert to array via `Object.values(group.members || {})` — Firebase may store as object

## Directory Structure

```
hostel-ledger/
├── src/                          # React frontend
│   ├── components/               # UI components (96 files)
│   ├── contexts/                 # React contexts (Auth, Data)
│   ├── hooks/                    # Custom hooks (sync, push, etc)
│   ├── lib/                      # Utilities (api, validation, etc)
│   ├── pages/                    # Route pages
│   └── OneSignalSDKWorker.ts     # Unified service worker
├── backend-server/
│   ├── server.js                 # Express API server (~2900 lines)
│   ├── .env                      # Backend environment (Zoho, Firebase, OneSignal keys)
│   ├── utils/email.js            # Email template loader
│   └── email-templates/          # HTML email templates
├── .env                          # Frontend environment (Firebase, Cloudinary, OneSignal keys)
├── .env.development              # Dev overrides
├── .env.production               # Production overrides
└── vite.config.ts                # Vite + PWA config
```

## Environment Files

- **Frontend `.env`:** Firebase config, Cloudinary, OneSignal App ID, VAPID keys
- **Backend `backend-server/.env`:** SMTP (Zoho primary + Gmail fallback), Firebase Admin SDK credentials, OneSignal REST API key

## SMTP Credentials

- **Primary (Zoho):** `hostelledger@aarx.online` (host: smtppro.zoho.com, port: 465, SSL)
- **Fallback (Gmail):** `ahmadraoabsar@gmail.com` (host: smtp.gmail.com, port: 587, STARTTLS, App Password)

## Common Gotchas

1. **`group.members` is NOT always an array** — Firebase stores it as an object if keys aren't sequential. Always use `Object.values(group.members || {})`
2. **Backend changes require restart** — `npm run start` in `backend-server/` (no hot-reload)
3. **Frontend changes are hot-reloaded** — `npm run dev` in root
4. **PWA devOptions** — `enabled: true` in vite.config.ts can cause refresh loops
5. **OneSignal `importScripts`** — Wrapped in try-catch to prevent SW crash if CDN is unreachable
6. **registerType** — Currently `autoUpdate` but can cause issues in dev; switch to `prompt` if refresh loops occur

## Running Locally

// turbo-all

1. Start backend:  `cd backend-server && npm run start` (runs on port 3000)
2. Start frontend: `npm run dev` (runs on port 8080)
3. Build: `npm run build` (outputs to dist/)

## Key Files Quick Reference

| Purpose | File |
|---------|------|
| Main App Router | `src/App.tsx` |
| Auth Context (real-time profile) | `src/contexts/FirebaseAuthContext.tsx` |
| Data Context (groups, expenses) | `src/contexts/FirebaseDataContext.tsx` |
| Add Expense UI | `src/components/AddExpenseSheet.tsx` |
| Backend API (all endpoints) | `backend-server/server.js` |
| Push Notifications Hook | `src/hooks/useOneSignalPush.ts` |
| Offline Sync Hook | `src/hooks/useSync.ts` |
| Service Worker | `src/OneSignalSDKWorker.ts` |
| Vite + PWA Config | `vite.config.ts` |
| Frontend API Client | `src/lib/api.ts` |

## Production URLs

- **App:** <https://hostel-ledger.aarx.online>
- **Backend API:** (deployed separately, check `.env.production` for URL)

## Owner

- **Developer:** Ahmad Rao Absar
- **Gmail:** <ahmadraoabsar@gmail.com>
