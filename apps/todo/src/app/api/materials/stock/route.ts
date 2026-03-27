import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getStockLevels, getStockSummary } from "@/lib/stock";

export async function GET(request: NextRequest) {
  const { error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId") || undefined;
  const itemId = searchParams.get("itemId") || undefined;
  const belowMinimumOnly = searchParams.get("belowMinimumOnly") === "true";
  const summary = searchParams.get("summary") === "true";

  if (summary) {
    const stockSummary = await getStockSummary();
    return NextResponse.json(stockSummary);
  }

  const levels = await getStockLevels({ locationId, itemId, belowMinimumOnly, includeAllItems: true });
  return NextResponse.json(levels);
}
