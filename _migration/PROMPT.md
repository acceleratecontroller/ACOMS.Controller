# Task Module Migration — Implementation Prompt

> **This file is an instruction set for a Claude Code instance.**
> Read this file completely before taking any action.
> The goal is to implement a standalone To-Do / Recurring Tasks module in this repository
> using the source files and documentation provided in the `_migration/` directory.

---

## Context

This repository (`ACOMS.Controller` or similar shared-tools repo) needs a standalone
To-Do / Recurring Tasks module. The source code was extracted from an existing app
called ACOMS.OS and is provided in `_migration/source-files/`.

The module must be **standalone** — it must NOT depend on ACOMS.OS code. It will later
be consumed by ACOMS.OS, WIP.OS, and other apps via API calls or package imports.

---

## What You Have

```
_migration/
├── PROMPT.md                          ← THIS FILE (your instructions)
├── docs/
│   └── extraction-guide.md            ← Detailed analysis of every file, coupling point, and dependency
└── source-files/
    ├── modules/tasks/
    │   ├── constants.ts               ← Task option constants (status, priority, frequency, etc.)
    │   ├── validation.ts              ← Zod validation schemas for task CRUD
    │   ├── recurrence.ts              ← Recurrence date calculation logic
    │   ├── service.ts                 ← Service layer with dependency injection
    │   └── index.ts                   ← Barrel export
    ├── api/
    │   ├── tasks/
    │   │   ├── route.ts               ← GET /api/tasks, POST /api/tasks
    │   │   └── [id]/
    │   │       ├── route.ts           ← GET/PUT/DELETE /api/tasks/[id]
    │   │       ├── complete/route.ts  ← POST /api/tasks/[id]/complete
    │   │       └── restore/route.ts   ← POST /api/tasks/[id]/restore
    │   ├── recurring-tasks/
    │   │   ├── route.ts               ← GET/POST /api/recurring-tasks
    │   │   └── [id]/
    │   │       ├── route.ts           ← GET/PUT/DELETE /api/recurring-tasks/[id]
    │   │       ├── complete/route.ts  ← POST /api/recurring-tasks/[id]/complete
    │   │       └── restore/route.ts   ← POST /api/recurring-tasks/[id]/restore
    │   └── dashboard/
    │       └── route.ts               ← GET /api/dashboard (task summary stats)
    ├── frontend/
    │   ├── tasks/
    │   │   ├── page.tsx               ← Main Task Manager page (full UI, ~980 lines)
    │   │   ├── types.ts               ← TypeScript interfaces, helpers, colour maps
    │   │   ├── TaskRow.tsx            ← Quick task row component
    │   │   ├── RecurringTaskRow.tsx   ← Recurring task row component
    │   │   └── RecurringCalendar.tsx  ← Calendar view for recurring tasks
    │   └── DashboardTaskCentre.tsx    ← Dashboard command centre widget
    ├── shared/
    │   └── date-utils.ts              ← Timezone-aware date boundary helpers (Australian TZ)
    └── schema/
        └── prisma-schema.prisma       ← Standalone database schema (no FK to external tables)
```

---

## Step-by-Step Implementation

### Phase 1: Project Setup

If this repo doesn't already have a Next.js project:

1. Initialise a Next.js app with TypeScript and Tailwind CSS
2. Install dependencies:
   ```bash
   npm install zod prisma @prisma/client next-auth bcryptjs
   npm install -D @types/bcryptjs
   ```
3. Set up the Prisma schema by copying `_migration/source-files/schema/prisma-schema.prisma`
   into `prisma/schema.prisma`
4. Configure `DATABASE_URL` in `.env`
5. Run `npx prisma migrate dev --name init` to create the database tables

If this repo already has a Next.js project, skip to installing any missing dependencies
and adding the Prisma schema.

### Phase 2: Install Pure Business Logic (copy as-is)

These files have ZERO external dependencies on ACOMS.OS. Copy them directly:

```
_migration/source-files/modules/tasks/constants.ts   → src/modules/tasks/constants.ts
_migration/source-files/modules/tasks/validation.ts   → src/modules/tasks/validation.ts
_migration/source-files/modules/tasks/recurrence.ts   → src/modules/tasks/recurrence.ts
_migration/source-files/modules/tasks/service.ts      → src/modules/tasks/service.ts
_migration/source-files/modules/tasks/index.ts        → src/modules/tasks/index.ts
_migration/source-files/shared/date-utils.ts          → src/shared/date-utils.ts
```

**Important**: The `validation.ts` file imports from `"zod/v4"`. If your project uses
a different Zod version, change the import to `"zod"`.

### Phase 3: Create Shared Infrastructure

The source API routes import from these ACOMS.OS modules that do NOT exist in this repo.
You must create equivalents:

#### 3a. Database client — `src/shared/database/client.ts`

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

#### 3b. Auth — `src/shared/auth/auth.ts`

Set up NextAuth (or your preferred auth solution). The task API routes expect `auth()`
to return a session object shaped like:

```ts
{
  user: {
    id: string;          // User ID (used as createdById)
    role: string;        // "ADMIN" or "STAFF" — task mutations require "ADMIN"
    employeeId?: string; // Optional — used to filter dashboard to own tasks
  }
}
```

You can implement this however you want. The key contract is:
- `auth()` returns `null` if not authenticated
- `session.user.role === "ADMIN"` gates write operations
- `session.user.id` is stored as `createdById` / `archivedById`

#### 3c. Audit logging — `src/shared/audit/log.ts`

Create a simple audit logger. If you included the AuditLog model in your Prisma schema:

```ts
import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database/client";

type AuditAction = "CREATE" | "UPDATE" | "ARCHIVE" | "RESTORE" | "DELETE";

interface AuditEntry {
  entityType: string;
  entityId: string;
  action: AuditAction;
  entityLabel: string;
  performedById: string;
  changes?: Record<string, { from: unknown; to: unknown }> | null;
}

export function audit(entry: AuditEntry) {
  prisma.auditLog
    .create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        entityLabel: entry.entityLabel,
        changes: entry.changes ? (entry.changes as Prisma.InputJsonValue) : Prisma.JsonNull,
        performedById: entry.performedById,
      },
    })
    .catch((err) => {
      console.error("[audit] Failed to write audit log:", err);
    });
}

export function diff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  skip: string[] = ["updatedAt", "archivedAt", "archivedById", "isArchived"],
): Record<string, { from: unknown; to: unknown }> | null {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(after)) {
    if (skip.includes(key)) continue;
    const a = normalise(before[key]);
    const b = normalise(after[key]);
    if (a !== b) changes[key] = { from: before[key], to: after[key] };
  }
  return Object.keys(changes).length > 0 ? changes : null;
}

function normalise(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object" && v !== null && "toFixed" in v) return String(v);
  return String(v);
}
```

Or if you don't want audit logging yet, create a no-op:

```ts
export function audit(_entry: unknown) { /* no-op */ }
export function diff() { return null; }
```

#### 3d. API helpers — `src/shared/api/helpers.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/database/client";

export async function parseBody<T = unknown>(
  request: NextRequest,
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
  try {
    const data = await request.json();
    return { data: data as T };
  } catch {
    return {
      error: NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      ),
    };
  }
}

// IMPORTANT: This function validates against the Task table's assigneeId.
// In the source code it's called "validateEmployeeRef" because ACOMS.OS
// uses employees. You should adapt this to your user/assignee model.
// If you don't have a separate assignee table, you can simply return null
// (skip validation) or validate against your User table.
export async function validateEmployeeRef(
  id: string | null | undefined,
  fieldName: string,
): Promise<NextResponse | null> {
  if (!id) return null;
  // TODO: Replace with your own assignee validation logic.
  // For now, we skip validation (any non-empty string is accepted).
  return null;
}

export async function withPrismaError<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<{ result: T; error?: never } | { result?: never; error: NextResponse }> {
  try {
    const result = await fn();
    return { result };
  } catch (err) {
    console.error(`${label}:`, err);
    const message = err instanceof Error ? err.message : "Unknown error";
    if (typeof err === "object" && err !== null && "code" in err) {
      const prismaErr = err as { code: string };
      if (prismaErr.code === "P2025") {
        return { error: NextResponse.json({ error: "Record not found" }, { status: 404 }) };
      }
      if (prismaErr.code === "P2003") {
        return { error: NextResponse.json({ error: "Referenced record does not exist" }, { status: 400 }) };
      }
      if (prismaErr.code === "P2002") {
        return { error: NextResponse.json({ error: "A record with that unique value already exists" }, { status: 409 }) };
      }
    }
    return { error: NextResponse.json({ error: `${label}: ${message}` }, { status: 500 }) };
  }
}
```

#### 3e. Shared UI components

The frontend pages use three shared components. Create simple versions:

**`src/shared/components/PageHeader.tsx`**
```tsx
interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {description && (
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      )}
    </div>
  );
}
```

**`src/shared/components/Modal.tsx`** and **`src/shared/components/ConfirmDialog.tsx`**

These are generic UI components. You can either:
- Build your own modal/confirm dialog
- Use a UI library (e.g. Radix, Headless UI)
- Copy the ACOMS.OS versions from the extraction guide (Section 1D lists them)

The Modal component expects props: `{ isOpen: boolean; onClose: () => void; children: React.ReactNode }`
The ConfirmDialog expects: `{ isOpen, title, message, confirmLabel, confirmVariant, onConfirm, onCancel }`

### Phase 4: Adapt and Install API Routes

Copy the API route files from `_migration/source-files/api/` into `src/app/api/`.

**Critical changes required in every API route file:**

1. **Rename `ownerId` to `assigneeId`** in all Prisma queries (the standalone schema
   uses `assigneeId` instead of `ownerId`). Find/replace across all route files:
   - `ownerId` → `assigneeId` in Prisma `where`, `data`, and `select` clauses
   - The `owner` relation no longer exists — replace `include: { owner: { select: ... } }`
     with however you want to resolve assignee info. Options:
     - Remove the include entirely and resolve assignee names on the frontend
     - Add a lookup after the query
     - Create an Assignee table with its own relation

2. **Update imports** — the source files import from ACOMS.OS paths:
   ```ts
   // CHANGE THESE:
   import { prisma } from "@/shared/database/client";          // keep as-is (you created this)
   import { auth } from "@/shared/auth/auth";                  // keep as-is (you created this)
   import { audit, diff } from "@/shared/audit/log";           // keep as-is (you created this)
   import { parseBody, validateEmployeeRef, withPrismaError } from "@/shared/api/helpers"; // keep
   import { createTaskSchema } from "@/modules/tasks/validation";  // keep (you copied this)
   import { calculateNextDue } from "@/modules/tasks/recurrence";  // keep (you copied this)
   ```

3. **The dashboard route** (`api/dashboard/route.ts`) imports `getDateBoundaries` from
   `@/shared/date-utils`. You copied this file in Phase 2. If your app is NOT in
   Australia, update the `APP_TIMEZONE` constant in `date-utils.ts`.

### Phase 5: Install Frontend

Copy the frontend files:

```
_migration/source-files/frontend/tasks/page.tsx            → src/app/(authenticated)/tasks/page.tsx
_migration/source-files/frontend/tasks/types.ts            → src/app/(authenticated)/tasks/types.ts
_migration/source-files/frontend/tasks/TaskRow.tsx         → src/app/(authenticated)/tasks/TaskRow.tsx
_migration/source-files/frontend/tasks/RecurringTaskRow.tsx → src/app/(authenticated)/tasks/RecurringTaskRow.tsx
_migration/source-files/frontend/tasks/RecurringCalendar.tsx → src/app/(authenticated)/tasks/RecurringCalendar.tsx
_migration/source-files/frontend/DashboardTaskCentre.tsx   → src/app/(authenticated)/DashboardTaskCentre.tsx
```

**Changes required in `page.tsx`:**

1. The page fetches `/api/employees` to populate the owner dropdown. You need to either:
   - Create an `/api/employees` or `/api/assignees` endpoint that returns `[{ id, firstName, lastName, employeeNumber }]`
   - Or change the page to accept assignees from a different source

2. The page calls `/api/auth/session` to check if the user is admin. This works
   automatically if you set up NextAuth.

3. Update the import path for constants:
   ```ts
   // This should already point to:
   import { ... } from "@/modules/tasks/constants";
   ```

**Changes required in `types.ts`:**

1. The `Employee` interface is used for the owner/assignee. Keep or rename as needed:
   ```ts
   export interface Employee {
     id: string;
     firstName: string;
     lastName: string;
     employeeNumber: string;
   }
   ```

2. The `ownerId` field in Task and RecurringTask interfaces should be renamed to
   `assigneeId` if you renamed it in the schema.

**Changes required in `DashboardTaskCentre.tsx`:**

This component is tightly coupled to the ACOMS.OS dashboard layout. You may want to:
- Use it as-is if your dashboard has a similar structure
- Simplify it to just fetch from `/api/dashboard` and display task summaries
- Skip it initially and add it later

### Phase 6: Add Navigation and Middleware

1. **Navigation**: Add a "Task Manager" link to your app's navigation pointing to `/tasks`

2. **Middleware** (optional): If you want admin-only access to tasks, add route protection:
   ```ts
   // In your middleware.ts
   const ADMIN_ONLY_ROUTES = ["/tasks"];
   const ADMIN_ONLY_API_ROUTES = ["/api/tasks", "/api/recurring-tasks"];
   ```

### Phase 7: Test

1. Run `npx prisma migrate dev` to ensure the schema is applied
2. Run `npm run dev` and navigate to `/tasks`
3. Test creating, editing, completing, and archiving tasks
4. Test recurring tasks with different frequencies
5. Verify the calendar view works

---

## Key Differences from ACOMS.OS Source

| Source (ACOMS.OS) | Standalone (this repo) | Why |
|---|---|---|
| `ownerId` → FK to Employee | `assigneeId` → plain string | No dependency on Employee table |
| `createdById` → FK to User | `createdById` → plain string | No dependency on User table |
| `owner` Prisma relation | No relation — resolve at app layer | Standalone module |
| `auth()` from NextAuth | Your own auth implementation | Decoupled |
| `audit()` writes to ACOMS.OS AuditLog | Your own audit (or no-op) | Decoupled |
| `validateEmployeeRef()` | Your own assignee validation | Decoupled |
| Hardcoded `role === "ADMIN"` | Same pattern (or make configurable) | Keep for now |

---

## Field Mapping Reference

When adapting the API routes, here's the complete field mapping:

### Task model
| ACOMS.OS field | Standalone field | Notes |
|---|---|---|
| `ownerId` | `assigneeId` | Rename everywhere |
| `owner` (relation) | removed | No FK relation |
| `createdById` | `createdById` | Same name, but no FK |
| `archivedById` | `archivedById` | Same name, but no FK |
| All other fields | unchanged | |

### RecurringTask model
| ACOMS.OS field | Standalone field | Notes |
|---|---|---|
| `ownerId` | `assigneeId` | Rename everywhere |
| `owner` (relation) | removed | No FK relation |
| All other fields | unchanged | |

---

## After Implementation

Once the module is working:

1. **Delete the `_migration/` directory** — it's no longer needed
2. Consider extracting the task module into a proper npm package if you want
   to share it between multiple Next.js apps
3. When ACOMS.OS needs to consume this module, it will call the API endpoints
   exposed by this repo, or import the package directly

---

## Reference Documentation

For the full coupling analysis, dependency map, and architectural decisions,
see `_migration/docs/extraction-guide.md`.
