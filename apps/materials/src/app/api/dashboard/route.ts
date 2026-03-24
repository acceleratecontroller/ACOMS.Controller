import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getStockLevels } from "@/lib/stock";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    lowStockItems,
    recentMovements,
    openStocktakes,
    itemCount,
    locationCount,
    movementCount,
  ] = await Promise.all([
    // Low stock alerts
    getStockLevels({ belowMinimumOnly: true }),

    // Recent movements (last 10)
    prisma.stockMovement.findMany({
      include: {
        item: { select: { code: true, description: true } },
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    // Open stocktakes
    prisma.stocktake.findMany({
      where: { status: "DRAFT" },
      include: {
        location: { select: { name: true } },
        _count: { select: { lines: true } },
      },
      orderBy: { createdAt: "desc" },
    }),

    // Counts
    prisma.item.count({ where: { isArchived: false } }),
    prisma.location.count({ where: { isArchived: false } }),
    prisma.stockMovement.count(),
  ]);

  // Get stock summary by location
  const allStock = await getStockLevels();
  const stockByLocation = new Map<string, { locationName: string; itemCount: number; totalItems: number }>();
  for (const s of allStock) {
    if (s.currentStock <= 0) continue;
    const existing = stockByLocation.get(s.locationId);
    if (existing) {
      existing.itemCount++;
    } else {
      stockByLocation.set(s.locationId, {
        locationName: s.locationName,
        itemCount: 1,
        totalItems: 0,
      });
    }
  }

  return NextResponse.json({
    lowStockItems,
    recentMovements,
    openStocktakes,
    stockByLocation: Array.from(stockByLocation.values()),
    counts: {
      items: itemCount,
      locations: locationCount,
      movements: movementCount,
    },
  });
}
