# Strata

This project is a Next.js App Router app for strata notice intake, AI triage, and owner dispatch workflows.

## Required Environment Variables

Copy `.env.example` to `.env.local` for local development.

### Firebase client config

These are safe to expose to the browser and should be configured as `NEXT_PUBLIC_` variables:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Firebase admin config

These are server-only variables used by Vercel to persist notices, sync logs, and properties in Firestore:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

`FIREBASE_PRIVATE_KEY` can be pasted into Vercel either as a multiline value or with `\n` characters. The app normalizes `\n` automatically.

### Other server-only secrets

- `GEMINI_API_KEY`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `APP_BASIC_AUTH_USER`
- `APP_BASIC_AUTH_PASSWORD`

## Local Development

Without Firebase admin credentials, local development falls back to the existing SQLite file (`workflow.db`) for notices, sync logs, and properties. On Vercel, that fallback is intentionally disabled because filesystem storage is ephemeral.

## Vercel Deployment Notes

1. Import this repository into Vercel.
2. Add every variable listed above in the project settings before the first production deploy.
3. Redeploy after adding the variables.
4. Make sure the Firebase service account used by `FIREBASE_CLIENT_EMAIL` has Firestore access to your Firebase project.
5. Set `APP_BASIC_AUTH_USER` and `APP_BASIC_AUTH_PASSWORD` if you want the whole app protected behind a simple login prompt, which is strongly recommended for this internal workflow tool.

## Data Model

- `owners` still use the client-side Firebase SDK.
- `owners` therefore still require a signed-in Firebase user whose UID exists in `/roles_admin/{uid}`.
- `strataNotices`, `syncLogs`, and `properties` now use Firestore on the server when Firebase admin variables are present.
- The app forces dynamic rendering for database-backed pages so Vercel does not freeze empty build-time snapshots into production.
