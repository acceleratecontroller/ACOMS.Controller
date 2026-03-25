/**
 * Stock service — derives stock levels from movements.
 *
 * All stock queries go through this module. When a cached/materialized
 * approach is needed later, only this file needs to change.
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface StockLevel {
  itemId: string;
  itemCode: string;
  itemDescription: string;
  unitOfMeasure: string;
  locationId: string;
  locationName: string;
  currentStock: number;
  minimumStockLevel: number | null;
  isBelowMinimum: boolean;
}

export interface StockSummaryByItem {
  itemId: string;
  itemCode: string;
  itemDescription: string;
  unitOfMeasure: string;
  totalStock: number;
  minimumStockLevel: number | null;
  isBelowMinimum: boolean;
}

/**
 * Get stock levels for all items at all locations.
 * Optionally filter by locationId or itemId.
 */
export async function getStockLevels(filters?: {
  locationId?: string;
  itemId?: string;
  belowMinimumOnly?: boolean;
}): Promise<StockLevel[]> {
  const where: Prisma.StockMovementWhereInput = {};
  if (filters?.itemId) where.itemId = filters.itemId;

  const locationFilter = filters?.locationId;

  const movements = await prisma.stockMovement.findMany({
    where,
    select: {
      itemId: true,
      quantity: true,
      fromLocationId: true,
      toLocationId: true,
      item: {
        select: {
          code: true,
          description: true,
          unitOfMeasure: true,
          minimumStockLevel: true,
          isArchived: true,
        },
      },
      fromLocation: { select: { id: true, name: true } },
      toLocation: { select: { id: true, name: true } },
    },
  });

  // Aggregate stock per item per location
  const stockMap = new Map<string, {
    itemId: string;
    itemCode: string;
    itemDescription: string;
    unitOfMeasure: string;
    locationId: string;
    locationName: string;
    quantity: number;
    minimumStockLevel: number | null;
  }>();

  for (const m of movements) {
    const qty = Number(m.quantity);

    // Stock going TO a location (increase)
    if (m.toLocationId && m.toLocation) {
      const key = `${m.itemId}:${m.toLocationId}`;
      const existing = stockMap.get(key);
      if (existing) {
        existing.quantity += qty;
      } else {
        stockMap.set(key, {
          itemId: m.itemId,
          itemCode: m.item.code,
          itemDescription: m.item.description,
          unitOfMeasure: m.item.unitOfMeasure,
          locationId: m.toLocationId,
          locationName: m.toLocation.name,
          quantity: qty,
          minimumStockLevel: m.item.minimumStockLevel ? Number(m.item.minimumStockLevel) : null,
        });
      }
    }

    // Stock leaving FROM a location (decrease)
    if (m.fromLocationId && m.fromLocation) {
      const key = `${m.itemId}:${m.fromLocationId}`;
      const existing = stockMap.get(key);
      if (existing) {
        existing.quantity -= qty;
      } else {
        stockMap.set(key, {
          itemId: m.itemId,
          itemCode: m.item.code,
          itemDescription: m.item.description,
          unitOfMeasure: m.item.unitOfMeasure,
          locationId: m.fromLocationId,
          locationName: m.fromLocation.name,
          quantity: -qty,
          minimumStockLevel: m.item.minimumStockLevel ? Number(m.item.minimumStockLevel) : null,
        });
      }
    }
  }

  let results: StockLevel[] = Array.from(stockMap.values()).map((s) => ({
    itemId: s.itemId,
    itemCode: s.itemCode,
    itemDescription: s.itemDescription,
    unitOfMeasure: s.unitOfMeasure,
    locationId: s.locationId,
    locationName: s.locationName,
    currentStock: s.quantity,
    minimumStockLevel: s.minimumStockLevel,
    isBelowMinimum: s.minimumStockLevel !== null && s.quantity < s.minimumStockLevel,
  }));

  if (locationFilter) {
    results = results.filter((r) => r.locationId === locationFilter);
  }

  if (filters?.belowMinimumOnly) {
    results = results.filter((r) => r.isBelowMinimum);
  }

  return results.sort((a, b) => a.itemCode.localeCompare(b.itemCode));
}

/**
 * Get total stock for a specific item across all locations.
 */
export async function getStockForItem(itemId: string): Promise<number> {
  const levels = await getStockLevels({ itemId });
  return levels.reduce((sum, l) => sum + l.currentStock, 0);
}

/**
 * Get stock for a specific item at a specific location.
 * Used by stocktake to determine expected quantities.
 */
export async function getStockAtLocation(
  itemId: string,
  locationId: string,
): Promise<number> {
  const levels = await getStockLevels({ itemId, locationId });
  const match = levels.find((l) => l.locationId === locationId);
  return match?.currentStock ?? 0;
}

/**
 * Get stock for ALL items at a specific location in a single query.
 * Returns a Map of itemId → currentStock.
 *
 * Use this instead of calling getStockAtLocation() per item
 * when you need stock levels for many items at one location
 * (e.g. stocktake creation).
 */
export async function getStockByItemAtLocation(
  locationId: string,
): Promise<Map<string, number>> {
  const levels = await getStockLevels({ locationId });
  const map = new Map<string, number>();
  for (const l of levels) {
    map.set(l.itemId, l.currentStock);
  }
  return map;
}

/**
 * Get summary stock levels grouped by item (all locations combined).
 */
export async function getStockSummary(): Promise<StockSummaryByItem[]> {
  const levels = await getStockLevels();
  const summaryMap = new Map<string, StockSummaryByItem>();

  for (const l of levels) {
    const existing = summaryMap.get(l.itemId);
    if (existing) {
      existing.totalStock += l.currentStock;
    } else {
      summaryMap.set(l.itemId, {
        itemId: l.itemId,
        itemCode: l.itemCode,
        itemDescription: l.itemDescription,
        unitOfMeasure: l.unitOfMeasure,
        totalStock: l.currentStock,
        minimumStockLevel: l.minimumStockLevel,
        isBelowMinimum: false,
      });
    }
  }

  const results = Array.from(summaryMap.values()).map((s) => ({
    ...s,
    isBelowMinimum: s.minimumStockLevel !== null && s.totalStock < s.minimumStockLevel,
  }));

  return results.sort((a, b) => a.itemCode.localeCompare(b.itemCode));
}
