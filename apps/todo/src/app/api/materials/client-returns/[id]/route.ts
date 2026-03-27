import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { updateClientReturnSchema } from "@/modules/materials/validation";
import { audit } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const { id } = await params;
  const { data: body, error: parseErr } = await parseBody(request);
  if (parseErr) return parseErr;

  const parsed = updateClientReturnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { action, notes } = parsed.data;

  // Fetch the return record
  const { result: clientReturn, error: fetchErr } = await withPrismaError(
    "Failed to fetch client return",
    () => prisma.clientReturn.findUniqueOrThrow({
      where: { id },
      include: {
        item: { select: { code: true, description: true } },
        job: { select: { projectId: true, name: true } },
      },
    }),
  );
  if (fetchErr) return fetchErr;

  if (clientReturn.status === "RETURNED") {
    return NextResponse.json({ error: "This return has already been marked as returned" }, { status: 400 });
  }

  if (action === "MARK_RETURNED") {
    // Mark as returned to client — remove stock from the location
    const { result: updated, error } = await withPrismaError(
      "Failed to update client return",
      () => prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Create an ISSUED movement to remove stock from the location
        await tx.stockMovement.create({
          data: {
            itemId: clientReturn.itemId,
            quantity: Number(clientReturn.quantity),
            movementType: "ISSUED",
            ownershipType: "COMPANY",
            fromLocationId: clientReturn.locationId,
            notes: notes || `Returned to client${clientReturn.job ? ` (from job ${clientReturn.job.projectId})` : ""}`,
            createdById: session.user.id,
          },
        });

        return tx.clientReturn.update({
          where: { id },
          data: {
            status: "RETURNED",
            returnedAt: new Date(),
            notes: notes || clientReturn.notes,
          },
        });
      }),
    );
    if (error) return error;

    audit({
      entityType: "ClientReturn",
      entityId: id,
      action: "UPDATE",
      entityLabel: `${clientReturn.item.code} — Returned to client`,
      performedById: session.user.id,
    });

    return NextResponse.json(updated);
  }

  if (action === "RETURN_TO_STOCK") {
    // Client doesn't want it — delete the return record (stock is already at the location)
    const { error } = await withPrismaError(
      "Failed to return to stock",
      () => prisma.clientReturn.delete({ where: { id } }),
    );
    if (error) return error;

    audit({
      entityType: "ClientReturn",
      entityId: id,
      action: "DELETE",
      entityLabel: `${clientReturn.item.code} — Returned to stock instead`,
      performedById: session.user.id,
    });

    return NextResponse.json({ success: true, action: "RETURN_TO_STOCK" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
