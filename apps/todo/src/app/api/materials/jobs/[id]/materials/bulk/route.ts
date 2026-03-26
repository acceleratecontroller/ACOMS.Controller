import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { bulkCreateJobMaterialSchema } from "@/modules/materials/validation";
import { getStockLevels } from "@/lib/stock";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const { id } = await params;
  const { data: body, error: parseErr } = await parseBody(request);
  if (parseErr) return parseErr;

  const parsed = bulkCreateJobMaterialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // Look up unallocated stock at the job's location for each item
  const unallocatedMap = new Map<string, number>();
  try {
    const job = await prisma.job.findUnique({ where: { id }, select: { locationId: true } });
    if (job?.locationId) {
      const levels = await getStockLevels({ locationId: job.locationId });
      for (const l of levels) {
        if (l.locationId === job.locationId) {
          unallocatedMap.set(l.itemId, Math.max(0, l.unallocated));
        }
      }
    }
  } catch {
    // If stock lookup fails, all fromStockQty default to 0
  }

  const { result, error } = await withPrismaError("Failed to bulk add material requirements", () =>
    prisma.jobMaterial.createMany({
      data: parsed.data.items.map((item) => ({
        jobId: id,
        itemId: item.itemId,
        requiredQty: item.requiredQty,
        fromStockQty: Math.min(item.requiredQty, unallocatedMap.get(item.itemId) || 0),
        notes: item.notes,
      })),
      skipDuplicates: true,
    }),
  );
  if (error) return error;

  return NextResponse.json({ created: result.count }, { status: 201 });
}
