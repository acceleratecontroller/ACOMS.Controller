import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStockLevels, getStockSummary } from "@/lib/stock";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId") || undefined;
  const itemId = searchParams.get("itemId") || undefined;
  const belowMinimumOnly = searchParams.get("belowMinimumOnly") === "true";
  const summary = searchParams.get("summary") === "true";

  if (summary) {
    const stockSummary = await getStockSummary();
    return NextResponse.json(stockSummary);
  }

  const levels = await getStockLevels({ locationId, itemId, belowMinimumOnly });
  return NextResponse.json(levels);
}
