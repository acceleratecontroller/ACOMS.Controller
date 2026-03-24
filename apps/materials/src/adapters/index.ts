/**
 * Integration adapters — placeholder interfaces for future WIP/ACOMS.OS integration.
 *
 * When WIP integration is ready, implement ClientAdapter and ProjectAdapter
 * to bridge between the materials system and WIP services.
 */

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

// ─── Auth Context ────────────────────────────────────────

export interface AuthUser {
  id: string;
  role: string;
  employeeId?: string;
}

export interface AuthAdapter {
  getCurrentUser(): Promise<AuthUser | null>;
}

// ─── Audit Logging ───────────────────────────────────────

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
