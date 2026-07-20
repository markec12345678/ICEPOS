import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/inventory-valuation — poročilo vrednosti zaloge
// Pregled vrednosti zaloge po kategorijah, dobaviteljih in lokacijah
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const items = await db.inventoryItem.findMany({
      where: { restaurantId: tenant.id },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // Izračunaj vrednost za vsak item
    const valuedItems = items.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      unit: item.unit,
      quantity: item.quantity,
      minQuantity: item.minQuantity,
      costPerUnit: item.costPerUnit,
      totalValue: item.quantity * item.costPerUnit,
      supplier: item.supplier,
      expiryDate: item.expiryDate?.toISOString() || null,
      batchNumber: item.batchNumber,
      isLowStock: item.quantity <= item.minQuantity,
      isOutOfStock: item.quantity === 0,
      daysToExpiry: item.expiryDate
        ? Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
    }));

    // Skupna vrednost
    const totalValue = valuedItems.reduce((s, i) => s + i.totalValue, 0);
    const totalItems = valuedItems.length;
    const lowStockCount = valuedItems.filter((i) => i.isLowStock).length;
    const outOfStockCount = valuedItems.filter((i) => i.isOutOfStock).length;
    const expiringSoonCount = valuedItems.filter(
      (i) => i.daysToExpiry !== null && i.daysToExpiry <= 7 && i.daysToExpiry >= 0
    ).length;
    const expiredCount = valuedItems.filter(
      (i) => i.daysToExpiry !== null && i.daysToExpiry < 0
    ).length;

    // Po kategorijah
    const categoryMap = new Map<
      string,
      {
        category: string;
        itemCount: number;
        totalQuantity: number;
        totalValue: number;
        avgCost: number;
        lowStock: number;
      }
    >();

    for (const item of valuedItems) {
      const existing = categoryMap.get(item.category);
      if (existing) {
        existing.itemCount++;
        existing.totalQuantity += item.quantity;
        existing.totalValue += item.totalValue;
        if (item.isLowStock) existing.lowStock++;
      } else {
        categoryMap.set(item.category, {
          category: item.category,
          itemCount: 1,
          totalQuantity: item.quantity,
          totalValue: item.totalValue,
          avgCost: 0,
          lowStock: item.isLowStock ? 1 : 0,
        });
      }
    }

    for (const c of categoryMap.values()) {
      c.avgCost = c.itemCount > 0 ? c.totalValue / c.itemCount : 0;
    }

    // Po dobaviteljih
    const supplierMap = new Map<
      string,
      {
        supplier: string;
        itemCount: number;
        totalValue: number;
        avgCost: number;
      }
    >();

    for (const item of valuedItems) {
      const supplier = item.supplier || "Brez dobavitelja";
      const existing = supplierMap.get(supplier);
      if (existing) {
        existing.itemCount++;
        existing.totalValue += item.totalValue;
      } else {
        supplierMap.set(supplier, {
          supplier,
          itemCount: 1,
          totalValue: item.totalValue,
          avgCost: 0,
        });
      }
    }

    for (const s of supplierMap.values()) {
      s.avgCost = s.itemCount > 0 ? s.totalValue / s.itemCount : 0;
    }

    // Top vrednosti
    const topValueItems = [...valuedItems]
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    return NextResponse.json({
      items: valuedItems,
      categorySummary: Array.from(categoryMap.values()).sort((a, b) => b.totalValue - a.totalValue),
      supplierSummary: Array.from(supplierMap.values()).sort((a, b) => b.totalValue - a.totalValue),
      topValueItems,
      summary: {
        totalValue,
        totalItems,
        avgValuePerItem: totalItems > 0 ? totalValue / totalItems : 0,
        lowStockCount,
        outOfStockCount,
        expiringSoonCount,
        expiredCount,
        totalQuantity: valuedItems.reduce((s, i) => s + i.quantity, 0),
        categories: categoryMap.size,
        suppliers: supplierMap.size,
      },
    });
  } catch (e) {
    console.error("GET /api/inventory-valuation error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju vrednosti zaloge" }, { status: 500 });
  }
}
