# ACOMS Controller

A shared platform for business tools that sit above and between ACOMS.OS and WIP.OS.

## What is this?

This repository is the central home for **shared business tools** — apps and services that are used across multiple systems (ACOMS.OS, WIP.OS, and future apps). Instead of embedding these tools inside one app, they live here and can be accessed or embedded from anywhere.

## Current Modules

| Module | Status | Description |
|--------|--------|-------------|
| **To-Do / Recurring Tasks** | Active | Shared task management with recurring task support |

## Repo Structure

```
ACOMS.Controller/
├── apps/                    ← Standalone apps (each deploys separately)
│   └── todo/                ← To-Do & Recurring Tasks app (Next.js)
├── packages/                ← Shared code used by multiple apps
│   ├── shared-types/        ← TypeScript types shared across all apps
│   ├── shared-ui/           ← Reusable UI components
│   └── shared-config/       ← Shared configuration (TypeScript, etc.)
├── docs/                    ← Documentation
└── package.json             ← Workspace root
```

### Where things live

- **`apps/`** — Each folder is a separate deployable app. Today there's just `todo/`. When you add a new tool (e.g., a dashboard or job creator), it gets its own folder here.
- **`packages/shared-types/`** — TypeScript type definitions shared across apps. If two apps need to agree on what a "Task" or "Priority" looks like, the types go here.
- **`packages/shared-ui/`** — Reusable React components (buttons, badges, form inputs) that multiple apps can use.
- **`packages/shared-config/`** — Shared configuration files (TypeScript settings, linting rules, etc.) so all apps stay consistent.

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 14 (React) | Simple, well-documented, handles both UI and API |
| Database | PostgreSQL (Neon) | Hosted, serverless, scales well |
| ORM | Prisma | Type-safe database access, easy migrations |
| Styling | Tailwind CSS | Fast, consistent styling without CSS files |
| Hosting | Vercel | Native Next.js support, easy deployments |
| Language | TypeScript | Catches errors early, one language everywhere |

## Getting Started

### Prerequisites

- Node.js 18 or later
- A Neon database (free tier works fine): https://console.neon.tech

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up your database connection
cp apps/todo/.env.example apps/todo/.env
# Edit apps/todo/.env and add your Neon connection string

# 3. Push the database schema to Neon
cd apps/todo
npx prisma db push

# 4. Start the dev server
npm run dev
```

The app will be running at http://localhost:3000.

## Adding a New Shared Module

See [docs/adding-a-module.md](docs/adding-a-module.md) for step-by-step instructions.

## Future Plans

- Central dashboard
- Job creation tool
- Alerts & notifications
- AI / business logic services
- Connections to ACOMS.OS and WIP.OS databases

These will be added as new modules inside `apps/` when the time comes.
