import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withPrismaError } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { parseItemsCsv } from "@/modules/materials/import";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = request.headers.get("content-type") || "";
  let csvText: string;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    csvText = await file.text();
  } else {
    csvText = await request.text();
  }

  const result = parseItemsCsv(csvText);

  if (result.items.length === 0) {
    return NextResponse.json({
      success: 0,
      errors: result.errors,
      message: "No valid items found in file",
    }, { status: 400 });
  }

  let created = 0;
  const skipped: string[] = [];
  const createErrors: { code: string; message: string }[] = [];

  for (const item of result.items) {
    const { result: newItem, error } = await withPrismaError(
      `Failed to create item ${item.code}`,
      () =>
        prisma.item.create({
          data: {
            code: item.code,
            description: item.description,
            category: item.category,
            unitOfMeasure: item.unitOfMeasure as never,
            aliases: item.aliases,
            minimumStockLevel: item.minimumStockLevel,
            notes: item.notes,
            createdById: session.user.id,
          },
        }),
    );

    if (error) {
      const existing = await prisma.item.findUnique({ where: { code: item.code } });
      if (existing) {
        skipped.push(item.code);
      } else {
        createErrors.push({ code: item.code, message: "Failed to create" });
      }
      continue;
    }

    created++;
    audit({
      entityType: "Item",
      entityId: newItem.id,
      action: "CREATE",
      entityLabel: `${newItem.code} — ${newItem.description} (imported)`,
      performedById: session.user.id,
    });
  }

  return NextResponse.json({
    success: created,
    skipped: skipped.length,
    skippedCodes: skipped,
    parseErrors: result.errors,
    createErrors,
    total: result.items.length,
  });
}
