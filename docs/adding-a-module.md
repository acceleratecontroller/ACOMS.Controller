# Adding a New Shared Module

This guide explains how to add a new tool/app to the ACOMS Controller platform.

## Step 1: Create the app folder

Create a new folder inside `apps/`:

```
apps/
├── todo/          ← existing
└── your-new-app/  ← new
```

## Step 2: Set up the app

The easiest way is to copy the structure from `apps/todo/` and modify it:

```bash
# From the repo root
mkdir apps/your-new-app
cd apps/your-new-app
```

You'll need at minimum:
- `package.json` — with a name like `@acoms/your-new-app`
- `tsconfig.json` — extends the root config
- `next.config.js` — with `transpilePackages` for shared packages
- `prisma/schema.prisma` — if your app needs its own database tables
- `src/app/` — your pages and API routes

## Step 3: Register the workspace

The root `package.json` already has `"workspaces": ["apps/*", "packages/*"]`, so any new folder inside `apps/` is automatically picked up. Just run `npm install` from the root after adding it.

## Step 4: Use shared packages

Import shared types in your app:

```typescript
import type { TaskStatus, TaskPriority } from "@acoms/shared-types";
```

If you need new shared types, add them to `packages/shared-types/src/` and export them from `index.ts`.

## Step 5: Database

Each app can have its own Prisma schema and database, or share a database — your choice.

- **Own database**: Create a `prisma/schema.prisma` in your app with its own `DATABASE_URL`
- **Shared database**: Point to the same Neon database but add new tables

For connecting to external databases (ACOMS.OS, WIP.OS), you can add additional Prisma clients with different datasources.

## Step 6: Deploy

Each app in `apps/` can be deployed as a separate Vercel project. In Vercel:
1. Create a new project
2. Set the root directory to `apps/your-new-app`
3. Set the build command to `npm run build`
4. Add your environment variables

## Example: Adding a Dashboard App

```
apps/dashboard/
├── package.json
├── tsconfig.json
├── next.config.js
├── prisma/
│   └── schema.prisma
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   └── api/
    └── lib/
        └── prisma.ts
```

The dashboard could import from shared-types and shared-ui, and connect to both the To-Do database and the ACOMS.OS database if needed.

## Naming Convention

- App folders: lowercase, kebab-case (e.g., `job-creator`, `central-dashboard`)
- Package names: `@acoms/app-name` (e.g., `@acoms/dashboard`)
- Shared package names: `@acoms/shared-*` (e.g., `@acoms/shared-types`)
