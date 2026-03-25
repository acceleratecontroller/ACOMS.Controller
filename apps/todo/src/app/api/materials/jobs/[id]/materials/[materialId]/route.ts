import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { updateJobMaterialSchema } from "@/modules/materials/validation";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; materialId: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { materialId } = await params;
  const { data: body, error: parseErr } = await parseBody(request);
  if (parseErr) return parseErr;

  const parsed = updateJobMaterialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { result: material, error } = await withPrismaError("Failed to update material requirement", () =>
    prisma.jobMaterial.update({
      where: { id: materialId },
      data: parsed.data,
      include: { item: { select: { code: true, description: true, unitOfMeasure: true } } },
    }),
  );
  if (error) return error;

  return NextResponse.json(material);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; materialId: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { materialId } = await params;

  const { error } = await withPrismaError("Failed to delete material requirement", () =>
    prisma.jobMaterial.delete({ where: { id: materialId } }),
  );
  if (error) return error;

  return NextResponse.json({ success: true });
}
