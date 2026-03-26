import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getStockLevels } from "@/lib/stock";

/**
 * GET /api/materials/stock/available?locationId=X
 *
 * Returns items with unallocated stock at the given location,
 * plus flags indicating availability at other locations.
 */
export async function GET(request: NextRequest) {
  const { error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId");

  if (!locationId) {
    return NextResponse.json(
      { error: "locationId is required" },
      { status: 400 },
    );
  }

  // Get stock at the target location
  const allLevels = await getStockLevels();

  // Build per-item data at target location
  const atLocation = new Map<string, {
    itemId: string;
    itemCode: string;
    itemDescription: string;
    unitOfMeasure: string;
    unallocated: number;
    currentStock: number;
    allocated: number;
  }>();

  for (const l of allLevels) {
    if (l.locationId === locationId) {
      atLocation.set(l.itemId, {
        itemId: l.itemId,
        itemCode: l.itemCode,
        itemDescription: l.itemDescription,
        unitOfMeasure: l.unitOfMeasure,
        unallocated: l.unallocated,
        currentStock: l.currentStock,
        allocated: l.allocated,
      });
    }
  }

  // Build other-locations map for items that exist at target location
  const otherLocations = new Map<string, { locationName: string; unallocated: number }[]>();
  for (const l of allLevels) {
    if (l.locationId !== locationId && l.unallocated > 0 && atLocation.has(l.itemId)) {
      const arr = otherLocations.get(l.itemId) || [];
      arr.push({ locationName: l.locationName, unallocated: l.unallocated });
      otherLocations.set(l.itemId, arr);
    }
  }

  // Also include items that don't exist at target location but exist at others
  // (so users can see they might be able to transfer)
  for (const l of allLevels) {
    if (l.locationId !== locationId && l.unallocated > 0 && !atLocation.has(l.itemId)) {
      // Create a zero-stock entry for this item at the target location
      atLocation.set(l.itemId, {
        itemId: l.itemId,
        itemCode: l.itemCode,
        itemDescription: l.itemDescription,
        unitOfMeasure: l.unitOfMeasure,
        unallocated: 0,
        currentStock: 0,
        allocated: 0,
      });
      const arr = otherLocations.get(l.itemId) || [];
      arr.push({ locationName: l.locationName, unallocated: l.unallocated });
      otherLocations.set(l.itemId, arr);
    }
  }

  const results = Array.from(atLocation.values())
    .map((item) => ({
      ...item,
      otherLocations: otherLocations.get(item.itemId) || [],
    }))
    .sort((a, b) => a.itemCode.localeCompare(b.itemCode));

  return NextResponse.json(results);
}
