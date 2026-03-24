/**
 * Integration adapters — placeholder interfaces for future ACOMS.OS integration.
 *
 * When ACOMS.OS connects to this task app, implement these interfaces
 * to bridge between the standalone task system and ACOMS.OS services.
 *
 * Usage:
 *   1. Implement the adapter interface for your consuming app
 *   2. Register it at app startup
 *   3. The task system calls through these adapters instead of direct imports
 */

// ─── Assignee Resolution ─────────────────────────────────
// Maps assigneeId strings to display names. ACOMS.OS will implement
// this by querying the Employee table; WIP.OS might use a User table.

export interface AssigneeInfo {
  id: string;
  firstName: string;
  lastName: string;
  identifier: string; // e.g. employee number, email
}

export interface AssigneeAdapter {
  resolve(assigneeId: string): Promise<AssigneeInfo | null>;
  list(): Promise<AssigneeInfo[]>;
  validate(assigneeId: string): Promise<boolean>;
}

// ─── Auth Context ────────────────────────────────────────
// Provides the current user identity. ACOMS.OS will wire this to
// its NextAuth session; other apps can use their own auth.

export interface AuthUser {
  id: string;
  role: string;
  employeeId?: string;
}

export interface AuthAdapter {
  getCurrentUser(): Promise<AuthUser | null>;
}

// ─── Audit Logging ───────────────────────────────────────
// Forwards audit events. ACOMS.OS can route these to its own
// AuditLog table or an event bus.

export interface AuditEvent {
  entityType: string;
  entityId: string;
  action: string;
  entityLabel: string;
  performedById: string;
  changes?: Record<string, { from: unknown; to: unknown }> | null;
}

export interface AuditAdapter {
  log(event: AuditEvent): void;
}

// ─── Dashboard / Search Summary ──────────────────────────
// Allows ACOMS.OS dashboard to pull task summary data without
// directly querying the task database.

export interface TaskSummary {
  activeTaskCount: number;
  overdueTaskCount: number;
  overdueRecurringCount: number;
  dueTodayTaskCount: number;
  dueTodayRecurringCount: number;
}

export interface DashboardAdapter {
  getTaskSummary(userId?: string): Promise<TaskSummary>;
}

// ═════════════════════════════════════════════════════════
// MATERIAL TRACKER ADAPTERS
// ═════════════════════════════════════════════════════════

// ─── Client Resolution ──────────────────────────────────
// Maps client references to display names and external IDs.
// WIP integration will implement this by querying the WIP Client table.

export interface ClientInfo {
  id: string;
  name: string;
  externalId?: string;
  externalSource?: string;
}

export interface ClientAdapter {
  resolve(clientName: string): Promise<ClientInfo | null>;
  search(query: string): Promise<ClientInfo[]>;
  validate(clientName: string): Promise<boolean>;
}

// ─── Project/Job Resolution ─────────────────────────────
// Maps project references to display names, codes, and external IDs.
// WIP integration will implement this by querying the WIP Project table.

export interface ProjectInfo {
  id: string;
  name: string;
  code?: string;
  clientName?: string;
  externalId?: string;
  externalSource?: string;
}

export interface ProjectAdapter {
  resolve(projectCode: string): Promise<ProjectInfo | null>;
  search(query: string): Promise<ProjectInfo[]>;
  validate(projectCode: string): Promise<boolean>;
}
