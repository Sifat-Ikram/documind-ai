# DocuMind AI

DocuMind AI is a full-stack document intelligence platform. Upload a PDF, DOCX or TXT file and let AI summarize it, extract key points and data, answer questions about it, simplify it, translate it, or pull out action items. You can also chat with a document, generate new documents from a prompt, convert files between formats, organize everything into collections with tags and favorites, share documents with other users, and manage the whole system from a built-in admin panel.

The project is a monorepo with two independent applications that talk to each other over HTTP:

```
documind-ai/
├── frontend/   Next.js 16 app (UI, proxy to the API)
├── backend/    NestJS 12 API (auth, documents, AI, admin)
└── README.md   ← this file
```

The frontend never calls the backend URL directly: Next.js rewrites every `/api/*` request to the backend, so cookies stay same-origin and the API can live on another host or port.

---

## Live Demo

| | Link |
| --- | --- |
| **Web app** | https://documind-ai-pi-nine.vercel.app/ |
| **Backend API** | https://documind-ai-backend-one.vercel.app/ |
| **Admin panel** | https://documind-ai-pi-nine.vercel.app/admin |

---

## Admin Access

The admin panel is available at **`/admin`** after signing in through the normal login page. An account only reaches it if its database role is `ADMIN`; the backend enforces this on every admin endpoint, not just in the UI.

|                 |                        |
| --------------- | ---------------------- |
| Admin panel URL | `/admin`               |
| Email           | `sifatikram@gmail.com` |
| Password        | `sifat123`             |

> The migration `20261121140000_admin_panel` promotes `sifatikram@gmail.com` to `ADMIN` automatically. If you re-seed or recreate the database, run that migration (or `prisma migrate deploy`) so the role is applied. Change this password before exposing the app publicly.

---

## Tech Stack

### Frontend

| Area             | Technology                                                                     |
| ---------------- | ------------------------------------------------------------------------------ |
| Framework        | **Next.js 16.4.6** (App Router, Turbopack)                                     |
| UI library       | **React 19.3**                                                                 |
| Language         | **TypeScript 5**                                                               |
| Styling          | **Tailwind CSS v4** (`@tailwindcss/turbopack`), `tailwind-merge`, `clsx`       |
| Animation        | **Framer Motion**                                                              |
| Icons            | **react-icons** (Feather set)                                                  |
| Rich text editor | **Tiptap 3** (`starter-kit`, `extension-table`, `pm`)                          |
| PDF rendering    | **pdfjs-dist** (worker copied into `public/` by `scripts/copy-pdf-worker.mjs`) |
| DOCX preview     | **docx-preview**                                                               |
| Markdown         | **react-markdown**                                                             |
| Toasts           | **sonner**                                                                     |
| Validation       | **zod**                                                                        |
| Linting          | ESLint 9 + `eslint-config-next`                                                |

### Backend

| Area                | Technology                                                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Framework           | **NestJS 12** (Express platform)                                                                                                 |
| Language            | **TypeScript 6**                                                                                                                 |
| Runtime             | **Node.js 24.x**                                                                                                                 |
| Database            | **PostgreSQL** via **Prisma 7** (`@prisma/adapter-pg`, `prisma-client` generator)                                                |
| Auth                | **@nestjs/jwt** access tokens + rotating refresh tokens, **bcryptjs** password hashing, **cookie-parser**                        |
| AI                  | **OpenAI SDK 7** pointed at **OpenRouter** (primary model + fallback list), streaming SSE                                        |
| File storage        | **Cloudinary**                                                                                                                   |
| Document parsing    | **pdf-parse**, **mammoth** (DOCX), plain text                                                                                    |
| Document generation | **pdfkit**, **docx**                                                                                                             |
| Markdown/HTML       | **marked**, **node-html-parser**                                                                                                 |
| Diffing             | **diff** (document version comparison)                                                                                           |
| Security            | **helmet**, CORS locked to the frontend origin, **@nestjs/throttler** rate limiting, global exception filter, zod env validation |
| Scheduled cleanup   | Secret-protected `/api/cron/purge` endpoint, triggered by Vercel Cron (`backend/vercel.json`)                                    |
| Observability       | `@nestjs/observe`, custom API metrics interceptor                                                                                |
| Testing             | Jest 30 + Supertest                                                                                                              |
| Linting             | oxlint (type-aware) + Prettier                                                                                                   |

---

## Features

### Public site (no login required)

- **Landing page** with product overview and calls to action.
- **AI Document Generator** (`/generate`) — pick a document type, length and language, write a prompt and get a document. Guests get a small per-browser quota (`GENERATE_GUEST_PER_BROWSER`, plus a shared `GENERATE_GUEST_POOL`); logged-in users get `GENERATE_USER_LIMIT` per period. Generated text can be copied, downloaded, or saved as a real document once signed in.
- **Features, About, FAQ, Contact, Privacy Policy, Terms** pages. Contact submissions are stored and show up in the admin panel.

| ![Landing page](./frontend/public/public-home.png) | ![Features page](./frontend/public/public-features.png) | ![AI Writer](./frontend/public/public-generate.png) |
| --- | --- | --- |
| Landing page | Features page | AI Writer (no account needed) |

### Authentication

- Email + password **register** and **login**.
- **Short-lived JWT access token** in an httpOnly cookie plus a **long-lived rotating refresh token** with family-based reuse detection (a stolen/replayed refresh token revokes the whole family).
- Silent refresh on expiry, logout, `/auth/me` profile endpoint.
- Route protection in the frontend via `src/proxy.ts` (cookie-presence redirect) — the real authorization always happens in the backend.
- Rate-limited auth endpoints, blocked-account support (`isBlocked`), last login / last active tracking.

### Document management

- **Upload** PDF, DOCX and TXT files (signature/size validation, readable-text extraction, page-accurate PDF text).
- Extraction pipeline stores chunks so long documents can still be processed within AI context limits.
- **Processing status** (`PROCESSING`, `COMPLETED`, `FAILED`) and a failed-processing log for uploads that never became documents.
- **Document viewer** with PDF/DOCX/TXT rendering, extracted text, word count and metadata.
- **Rename, edit content (rich text), delete**; delete moves to Trash.
- **Trash** with restore and automatic purge after the retention window (cron + lazy cleanup), `purgeAt` tracked per item.
- **Archive** and unarchive documents.
- **Favorites**, **tags** (per-user, unique names), **categories** with icons and ordering.
- **Collections** — group documents, add/remove members with `VIEWER`/`EDITOR` roles.
- **Bulk operations** on multiple documents (move, tag, archive, trash, delete).
- **Recently viewed** (`DocumentView`), **recent** and **dashboard** views with real statistics.
- **Per-document notes** with revision counter and version metadata.
- **Comments** on documents.

### AI features

- **Analysis tasks**: summarize, extract key points, document Q&A, extract structured data, simplify, translate (with target language), extract action items. One natural-language instruction can trigger several detected tasks; a safe fallback is used when task detection fails.
- **Chat with a document** — multi-turn conversations stored per document, streamed token-by-token over SSE.
- **Semantic-ish search** across documents (`/search`) with AI-assisted answers.
- **AI document generator** (templates, tone/length/language options, save to library).
- **AI usage tracking** — every call records model, prompt/completion/total tokens, latency, success and errors; surfaced in the admin panel.
- Model fallback chain (`OPENROUTER_FALLBACK_MODELS`) when the primary model is rate-limited or unavailable.

### Collaboration & sharing

- **Share a document** with another user as `VIEWER` or `EDITOR`, list and revoke shares, "Shared with me" view.
- Access control layer (`access` module) resolves a user's effective permission for a document before every read/write.

### Versions

- Every content/file change creates a **DocumentVersion** (title, file, extracted text, note, author).
- **Version history**, restore an older version, and compare versions with a text **diff**.

### Utilities

- **Document Converter** (`/converter`) — convert between supported formats (e.g. PDF/DOCX/TXT/Markdown) using `pdfkit`, `docx`, `mammoth`, `pdf-parse`, `marked`. Conversion jobs are tracked per user and expire automatically.
- **Analysis history** (`/history`) — past analyses with their instructions, detected tasks and results.
- **Settings** — profile, password, preferences (theme, defaults, etc.) stored as a per-user JSON preference record; **data export / account data** endpoints.
- **Profile** page.
- File download and clipboard helpers, upload progress, drag & drop.

### Workspace (signed in)

| ![Dashboard](./frontend/public/user-dashboard.png) | ![My Documents](./frontend/public/user-documents.png) |
| --- | --- |
| Dashboard — stats, recent documents and activity | My Documents — upload, search, filter and list/grid views |
| ![Document detail](./frontend/public/user-document-detail.png) | ![Analysis history](./frontend/public/user-analysis-history.png) |
| Document detail — preview, analyze, chat, versions, comments, notes | Analysis history — every saved AI result with its detected tasks |

### Admin panel (`/admin`)

| ![Admin sign-in](./frontend/public/admin-entry.png) | ![Overview](./frontend/public/admin-overview.png) |
| --- | --- |
| Admin sign-in | Overview — totals, growth and recent activity |
| ![User management](./frontend/public/admin-users.png) | ![Document management](./frontend/public/admin-documents.png) |
| User management — search, inspect, block, change role | Document management — every document across all users |

Server-side guarded: `AdminGuard` + role check on every endpoint, with dedicated admin schemas and services.

| Section                  | What it does                                                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Overview**             | Totals and growth for users, documents, storage, AI calls; recent activity.                                                                                         |
| **User Management**      | List/search users, inspect a user (documents, storage, AI usage), change role, block/unblock, delete a user. Admin accounts are protected from destructive actions. |
| **Document Management**  | Browse all documents across users, inspect details, filter by type/date/status, delete.                                                                             |
| **AI Usage & Analytics** | Token usage per feature/model, latency, success rate, error breakdown, time-series charts.                                                                          |
| **System Analytics**     | API request metrics (method, path, status, duration) and activity trends.                                                                                           |
| **System Monitoring**    | Health, database/storage figures, failed processing logs, purge status.                                                                                             |
| **Feedback & Support**   | User feedback and bug reports plus contact messages, with status workflow (`OPEN` → `IN_REVIEW` → `RESOLVED`).                                                      |
| **Admin Settings**       | Manage admin accounts (promote/demote, add/remove admins).                                                                                                          |

### Platform / infrastructure

- **Rate limiting** globally (100 req/min) with stricter limits on auth.
- **Zod validation** for environment variables — the backend refuses to boot with a bad config.
- **Cookie-based sessions** with `trust proxy` for reverse proxies, helmet headers, CORS bound to `FRONTEND_URL`.
- **Global exception filter** producing consistent error shapes.
- **API metrics interceptor** logging every request (path, status, duration, user) into `ApiRequestLog`.
- **Scheduled cleanup** (`/api/cron/purge`, bearer `CRON_SECRET`): expired trash items, expired conversion jobs, old generation logs and expired refresh tokens.
- **Health endpoint** at `GET /api/health`.
- **Prisma migrations** for the complete schema (users, documents, chunks, conversations, messages, analyses, refresh tokens, categories, trash, versions, tags, favorites, collections, shares, comments, notes, views, generated documents, conversion jobs, preferences, AI usage, API logs, failed processing, feedback, contact messages).

---

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma          # full data model
│   └── migrations/            # SQL migrations (incl. admin_panel)
├── scripts/embed-fonts.mjs    # embeds fonts used by PDF generation
├── src/
│   ├── main.ts                # bootstrap: helmet, cookies, CORS, /api prefix
│   ├── app.module.ts          # all feature modules
│   ├── config/env.ts          # zod env schema
│   ├── auth/  sessions/  users/            # authentication & accounts
│   ├── documents/  versions/  trash/  bulk/  categories/  tags/
│   ├── collections/  sharing/  access/  preferences/   # sharing also holds comments & notes
│   ├── ai/  analyses/  chat/  generator/  search/  converter/
│   ├── dashboard/  user-data/  usage/  feedback/  contact/
│   ├── admin/                 # admin controllers, services, guards, schemas
│   ├── cloudinary/  prisma/  common/  cron/  health/  config/
│   └── generated/prisma/      # generated Prisma client (committed build output)
└── vercel.json                # cron schedule for /api/cron/purge

frontend/
├── next.config.ts             # /api/* rewrite to BACKEND_URL
├── scripts/copy-pdf-worker.mjs
└── src/
    ├── proxy.ts               # protected-route redirects
    ├── app/
    │   ├── (public)/          # landing, features, about, faq, contact, privacy, terms, generate
    │   ├── (auth)/            # login, register
    │   ├── (app)/             # dashboard, documents, collections, converter, archive,
    │   │                      # shared, recent, history, trash, settings, profile
    │   └── admin/             # overview, users, documents, ai, analytics,
    │                          # monitoring, feedback, settings
    ├── components/            # ui primitives, layout, feature views, admin views
    ├── context/  hooks/  lib/  types/
    └── app/globals.css        # Tailwind v4 theme tokens
```

---

## Getting Started

### Prerequisites

- **Node.js 24.x** (backend pins `engines.node = 24.x`; Node 20+ works for the frontend)
- **PostgreSQL** database (Neon/Supabase/local all work)
- **Cloudinary** account (cloud name, API key, secret)
- **OpenRouter** API key and a model id

### 1. Backend

```bash
cd backend
npm install                 # runs `prisma generate` in postinstall
```

Create `backend/.env`:

```env
# Server
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000
CRON_SECRET=at-least-16-characters-long

# Database
DATABASE_URL=postgresql://user:password@host:5432/documind?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://user:password@host:5432/documind?sslmode=require

# Auth
JWT_SECRET=at-least-32-characters-long-random-string
JWT_ACCESS_EXPIRES_SECONDS=1800
JWT_REFRESH_EXPIRES_DAYS=30
REFRESH_GRACE_SECONDS=20

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# AI (OpenRouter)
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=deepseek/deepseek-chat-v3-0324:free
OPENROUTER_FALLBACK_MODELS=openrouter/free
AI_MAX_DOCUMENT_CHARS=40000
CHAT_CONTEXT_CHARS=12000

# Generator quotas
GENERATE_GUEST_PER_BROWSER=3
GENERATE_GUEST_POOL=15
GENERATE_USER_LIMIT=10
```

Apply the schema, then run:

```bash
npx prisma migrate deploy      # or: npm run migrate:deploy
npm run start:dev              # nest start --watch --env-file .env
```

The API is served under **`http://localhost:4000/api`**; check `GET /api/health`.

Other scripts: `npm run build` (nest build), `npm run start:prod` (runs `dist/main`), `npm run lint`, `npm run test`, `npm run test:e2e`.

### 2. Frontend

```bash
cd frontend
npm install                 # copies the pdf.js worker via postinstall
```

Create `frontend/.env.local`:

```env
BACKEND_URL=http://localhost:4000
```

Run:

```bash
npm run dev                 # http://localhost:3000
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`. `predev`/`prebuild` re-copy the PDF worker automatically.

### 3. Sign in as admin

1. Open `http://localhost:3000/login`.
2. Log in with `sifatikram@gmail.com` / `sifat123` (register it first if the database is empty, then run the admin migration, or promote it from `/admin/settings` with another admin account).
3. You are redirected to `/admin` automatically for admin accounts.

---

## Configuration Notes

**Backend**

- Every variable in `backend/src/config/env.ts` is validated by zod at boot. Missing `DATABASE_URL`, `JWT_SECRET` (≥32 chars), Cloudinary keys or `OPENROUTER_API_KEY` stop the process with a readable error.
- `FRONTEND_URL` is the only allowed CORS origin and the base for redirect links — set it to the real frontend origin in production.
- `CRON_SECRET` protects the purge endpoint that Vercel Cron calls.

**Frontend**

- `BACKEND_URL` is read at build/start time in `next.config.ts` and used for the `/api/:path*` rewrite. Trailing slashes are stripped. Defaults to `http://localhost:4000`.
- All API calls are relative (`/api/...`), so switching backends never requires touching component code.

---

## API Overview

All routes are prefixed with `/api`.

| Prefix                                                    | Purpose                                                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `/api/health`                                             | Liveness/readiness                                                                          |
| `/api/auth`                                               | register, login, refresh, logout, me                                                        |
| `/api/users`, `/api/users/preferences`, `/api/users/data` | profile, preferences, data export                                                           |
| `/api/documents`                                          | CRUD, upload, content, archive, bulk actions, categories, tags, notes, views, comments      |
| `/api/documents/:id/versions`                             | version history, restore, diff                                                              |
| `/api/analyses`                                           | run an analysis, list history, fetch result                                                 |
| `/api/chat`                                               | conversations and streamed messages                                                         |
| `/api/generate`                                           | AI document generation (guest + user quotas)                                                |
| `/api/search`                                             | search across documents                                                                     |
| `/api/converter`                                          | format conversion jobs and downloads                                                        |
| `/api/collections`                                        | collections and members                                                                     |
| `/api/documents/:id/shares`                               | sharing                                                                                     |
| `/api/tags`, `/api/categories`                            | taxonomy                                                                                    |
| `/api/trash`                                              | list, restore, purge                                                                        |
| `/api/dashboard`                                          | dashboard statistics                                                                        |
| `/api/feedback`, `/api/contact`                           | feedback and contact form                                                                   |
| `/api/cron/purge`                                         | scheduled cleanup (secret-protected)                                                        |
| `/api/admin/*`                                            | admin-only: overview, users, documents, AI usage, analytics, monitoring, feedback, settings |

---

## Data Model Highlights

- `User` — role (`USER`/`ADMIN`), blocked flag, activity timestamps.
- `Document` — current file + extracted text, type/size, word count, category, source (`UPLOAD`/`GENERATED`), current version, archived/trashed timestamps, processing status.
- `DocumentVersion` — all previous versions; `Document` always holds the current one.
- `DocumentChunk` — chunked text for long documents.
- `Conversation` / `Message` — chat with a document.
- `Analysis` — instruction, detected tasks, target language, result JSON.
- `RefreshToken` — hashed rotating tokens grouped into families for reuse detection.
- `Tag`, `DocumentTag`, `Favorite`, `Category`, `Collection`, `CollectionMember`, `CollectionDocument`.
- `DocumentShare`, `Comment`, `DocumentNote`, `DocumentView`.
- `GeneratedDocument`, `GenerationLog`, `ConversionJob`.
- `UserPreference`, `AiUsage`, `ApiRequestLog`, `FailedProcessingLog`, `Feedback`, `ContactMessage`, `TrashItem`.

---

## Deployment

The two apps deploy separately; the frontend only needs to know where the backend lives.

**Backend (e.g. Vercel / any Node 24 host)**

1. Set all backend environment variables in the host dashboard (never commit `.env`).
2. Build with `npm run build`, start with `npm run start:prod`.
3. Run `npx prisma migrate deploy` against the production database — this also applies the admin role migration.
4. `backend/vercel.json` registers a daily cron (`0 3 * * *`) hitting `/api/cron/purge`; make sure `CRON_SECRET` is set.

**Frontend (e.g. Vercel)**

1. Set `BACKEND_URL` to the deployed backend origin (no trailing slash).
2. Build with `npm run build`.
3. Point the backend's `FRONTEND_URL` at this deployment's origin so CORS and redirects match.

**Checklist before going public**

- Change the admin password (`sifatikram@gmail.com` / `sifat123`).
- Rotate `JWT_SECRET` and use a strong `CRON_SECRET`.
- Confirm Cloudinary upload restrictions and the AI quota values.
- Keep `DATABASE_URL` pooled for the app (`DATABASE_URL_UNPOOLED` is used for migrations).

---

## Scripts Reference

| Location    | Command                                | Description                |
| ----------- | -------------------------------------- | -------------------------- |
| `backend/`  | `npm run start:dev`                    | Watch-mode API with `.env` |
| `backend/`  | `npm run build` / `npm run start:prod` | Production build / run     |
| `backend/`  | `npm run migrate:deploy`               | Apply Prisma migrations    |
| `backend/`  | `npm run test` / `npm run test:e2e`    | Jest suites                |
| `backend/`  | `npm run lint` / `npm run format`      | oxlint / Prettier          |
| `backend/`  | `npm run embed-fonts`                  | Embed PDF fonts            |
| `frontend/` | `npm run dev`                          | Dev server on :3000        |
| `frontend/` | `npm run build` / `npm run start`      | Production build / run     |
| `frontend/` | `npm run lint`                         | ESLint                     |

---

## License

No license file is included. Treat the code as proprietary unless the owner adds one.
