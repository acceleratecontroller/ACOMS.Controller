import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { createJobMaterialSchema } from "@/modules/materials/validation";
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

  const parsed = createJobMaterialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // Look up the job's location to calculate unallocated stock
  let fromStockQty = 0;
  try {
    const job = await prisma.job.findUnique({ where: { id }, select: { locationId: true } });
    if (job?.locationId) {
      const levels = await getStockLevels({ locationId: job.locationId, itemId: parsed.data.itemId });
      const level = levels.find((l) => l.locationId === job.locationId && l.itemId === parsed.data.itemId);
      if (level) {
        fromStockQty = Math.min(parsed.data.requiredQty, Math.max(0, level.unallocated));
      }
    }
  } catch {
    // If stock lookup fails, default to 0
  }

  const { result: material, error } = await withPrismaError("Failed to add material requirement", () =>
    prisma.jobMaterial.create({
      data: {
        jobId: id,
        itemId: parsed.data.itemId,
        requiredQty: parsed.data.requiredQty,
        fromStockQty,
        notes: parsed.data.notes,
      },
      include: { item: { select: { code: true, description: true, unitOfMeasure: true } } },
    }),
  );
  if (error) return error;

  return NextResponse.json(material, { status: 201 });
}
