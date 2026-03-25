import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { bulkCreateJobMaterialSchema } from "@/modules/materials/validation";

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

  const { result, error } = await withPrismaError("Failed to bulk add material requirements", () =>
    prisma.jobMaterial.createMany({
      data: parsed.data.items.map((item) => ({
        jobId: id,
        itemId: item.itemId,
        requiredQty: item.requiredQty,
        notes: item.notes,
      })),
      skipDuplicates: true,
    }),
  );
  if (error) return error;

  return NextResponse.json({ created: result.count }, { status: 201 });
}
