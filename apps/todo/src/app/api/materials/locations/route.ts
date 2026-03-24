import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { createLocationSchema } from "@/modules/materials/validation";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { result: locations, error } = await withPrismaError("Failed to fetch locations", () =>
    prisma.location.findMany({
      where: { isArchived: false },
      orderBy: { name: "asc" },
    }),
  );
  if (error) return error;

  return NextResponse.json(locations);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: body, error: parseErr } = await parseBody(request);
  if (parseErr) return parseErr;

  const parsed = createLocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { result: location, error } = await withPrismaError("Failed to create location", () =>
    prisma.location.create({ data: parsed.data }),
  );
  if (error) return error;

  audit({
    entityType: "Location",
    entityId: location.id,
    action: "CREATE",
    entityLabel: location.name,
    performedById: session.user.id,
  });

  return NextResponse.json(location, { status: 201 });
}
