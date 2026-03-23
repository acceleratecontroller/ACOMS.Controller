import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/categories — list all categories
export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(categories);
}

// POST /api/categories — create a category
export async function POST(request: NextRequest) {
  const body = await request.json();

  const category = await prisma.category.create({
    data: {
      name: body.name,
      color: body.color ?? null,
    },
  });

  return NextResponse.json(category, { status: 201 });
}
