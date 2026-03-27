import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { archiveJobSchema } from "@/modules/materials/validation";
import { audit } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const { id } = await params;
  const { data: body, error: parseErr } = await parseBody(request);
  if (parseErr) return parseErr;

  const parsed = archiveJobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { disposition } = parsed.data;

  // Fetch job with all materials and movements
  const { result: job, error: fetchErr } = await withPrismaError("Failed to fetch job", () =>
    prisma.job.findUniqueOrThrow({
      where: { id },
      include: {
        location: true,
        materials: {
          include: { item: { select: { code: true, description: true } } },
        },
        movements: true,
      },
    }),
  );
  if (fetchErr) return fetchErr;

  if (job.isArchived) {
    return NextResponse.json({ error: "Job is already archived" }, { status: 400 });
  }

  if (!job.locationId) {
    return NextResponse.json({ error: "Job has no location assigned" }, { status: 400 });
  }

  const locationId = job.locationId;

  // Build a summary of all material on this job:
  // - fromStockQty from JobMaterial records
  // - receivedQty from StockMovement records
  const receivedByItem = new Map<string, number>();
  for (const m of job.movements) {
    receivedByItem.set(m.itemId, (receivedByItem.get(m.itemId) || 0) + Number(m.quantity));
  }

  // Combine materials: each item has fromStockQty + receivedQty to disposition
  interface MaterialToDispose {
    itemId: string;
    fromStockQty: number;
    receivedQty: number;
    totalQty: number;
  }

  const materialsToDispose: MaterialToDispose[] = [];

  for (const mat of job.materials) {
    const fromStockQty = Number(mat.fromStockQty ?? 0);
    const receivedQty = receivedByItem.get(mat.itemId) || 0;
    const totalQty = fromStockQty + receivedQty;
    if (totalQty > 0) {
      materialsToDispose.push({ itemId: mat.itemId, fromStockQty, receivedQty, totalQty });
    }
    // Remove from receivedByItem so we can catch items received but not in requirements
    receivedByItem.delete(mat.itemId);
  }

  // Also include items that were received against the job but not in requirements
  for (const [itemId, qty] of receivedByItem.entries()) {
    if (qty > 0) {
      materialsToDispose.push({ itemId, fromStockQty: 0, receivedQty: qty, totalQty: qty });
    }
  }

  // Execute everything in a transaction
  const { result: archived, error } = await withPrismaError("Failed to archive job", () =>
    prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (disposition === "RETURN_TO_STOCK") {
        // Create RETURNED_FROM_JOB movements to deallocate stock back to the location
        for (const mat of materialsToDispose) {
          // For received materials: create a movement that removes job allocation
          // The original movements added stock TO location WITH jobId (allocated).
          // To deallocate, we create a RETURNED_FROM_JOB movement:
          //   fromLocation = job location (removes allocated stock)
          //   toLocation = job location (adds back as unallocated)
          // Net stock effect = 0, but allocated decreases
          if (mat.receivedQty > 0) {
            await tx.stockMovement.create({
              data: {
                itemId: mat.itemId,
                quantity: mat.receivedQty,
                movementType: "RETURNED_FROM_JOB",
                ownershipType: "COMPANY",
                fromLocationId: locationId,
                toLocationId: locationId,
                jobId: id,
                notes: `Returned to stock on job archive (received materials)`,
                createdById: session.user.id,
              },
            });
          }

          // For from-stock materials: these were already at the location but "allocated"
          // via the fromStockQty field. No movement needed — just clearing the
          // JobMaterial record releases the allocation.
        }
      } else {
        // RETURN_TO_CLIENT — create ClientReturn records
        for (const mat of materialsToDispose) {
          await tx.clientReturn.create({
            data: {
              itemId: mat.itemId,
              quantity: mat.totalQty,
              jobId: id,
              locationId,
              status: "TO_BE_RETURNED",
              createdById: session.user.id,
            },
          });

          // Create movements to deallocate from job (same as return-to-stock
          // for the movement layer — the ClientReturn record tracks the obligation)
          if (mat.receivedQty > 0) {
            await tx.stockMovement.create({
              data: {
                itemId: mat.itemId,
                quantity: mat.receivedQty,
                movementType: "RETURNED_FROM_JOB",
                ownershipType: "COMPANY",
                fromLocationId: locationId,
                toLocationId: locationId,
                jobId: id,
                notes: `Returned from job for client return`,
                createdById: session.user.id,
              },
            });
          }
        }
      }

      // Delete all JobMaterial records
      await tx.jobMaterial.deleteMany({ where: { jobId: id } });

      // Archive the job
      const result = await tx.job.update({
        where: { id },
        data: {
          isArchived: true,
          archivedAt: new Date(),
          archivedById: session.user.id,
        },
      });

      return result;
    }),
  );
  if (error) return error;

  audit({
    entityType: "Job",
    entityId: archived.id,
    action: "ARCHIVE",
    entityLabel: `${archived.projectId} — ${job.name}`,
    performedById: session.user.id,
    changes: {
      disposition: { from: null, to: disposition },
      materialsDisposed: { from: null, to: materialsToDispose.length },
    },
  });

  return NextResponse.json({
    success: true,
    disposition,
    materialsDisposed: materialsToDispose.length,
  });
}
