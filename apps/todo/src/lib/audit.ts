/**
 * Audit logging — writes to the AuditLog table.
 *
 * When ACOMS.OS integrates, this can be swapped for a shared audit
 * service or event bus without changing the API route code.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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
        changes: entry.changes
          ? (entry.changes as Prisma.InputJsonValue)
          : Prisma.JsonNull,
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
  if (Array.isArray(v)) return JSON.stringify(v);
  if (typeof v === "object" && v !== null && "toFixed" in v) return String(v);
  return String(v);
}
