# Strata Notice Operations Workspace

A Next.js application for receiving strata notices, using AI to summarize and categorize them, matching notices to properties and owners, and preparing owner communications.

## Core workflows

- Synchronize notice emails and attachments from Gmail
- Summarize and categorize notices with Genkit and Gemini
- Match building identifiers to managed properties
- Review notices in an operations inbox
- Generate and dispatch owner-facing messages
- Import property information from Buildium CSV exports
- Track notice history, owners, properties, and sync activity
- Use an isolated demo workspace without touching live data

## Stack

- Next.js 15 App Router, React 19, and TypeScript
- Genkit with Google Gemini
- Firebase Authentication and Firestore
- Gmail via IMAP and outbound mail via Nodemailer
- SQLite fallback for local development
- Tailwind CSS, Radix UI, and Recharts

## Local development

Requirements: Node.js 22 and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

The application runs at `http://localhost:9002`.

Without Firebase Admin credentials, local development uses `workflow.db`. Vercel intentionally does not use SQLite because its filesystem is ephemeral.

## Environment variables

Firebase client:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Server-side:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `GEMINI_API_KEY`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`

Keep all server-side values out of client code and commits.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Next.js with Turbopack |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run typecheck` | Run TypeScript checks |
| `npm run genkit:dev` | Start the Genkit development flow |
| `npm run genkit:watch` | Start Genkit in watch mode |

## Key directories

- `src/app/inbox/` — notice queue and detail workspace
- `src/app/gmail-sync/` — synchronization interface
- `src/ai/flows/` — notice summarization and owner-message generation
- `src/lib/server-store.ts` — server-side persistence abstraction
- `src/lib/owner-matching.ts` — owner/property matching
- `src/lib/dispatch-email.ts` — owner email dispatch
- `src/lib/buildium-import.ts` — Buildium data import

## Deployment

Import the repository into Vercel, add every required variable, enable Firebase Email/Password authentication, and ensure the service account has Firestore access. Redeploy after changing environment variables.

## Security and scope

The demo workspace is isolated from Gmail, Firestore, and live owner records. Review generated summaries and messages before dispatch. This project is an operational prototype, not legal advice or a substitute for strata-document review.
