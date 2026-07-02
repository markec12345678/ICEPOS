import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/inventory/valuation — skupna vrednost zalog z analitiko
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const items = await db.inventoryItem.findMany({
      where: { restaurantId: tenant.id },
      orderBy: { name: "asc" },
    });

    // Izračunaj vrednost za vsak artikel
    const valuedItems = items.map((item) => {
      const stockValue = item.quantity * item.costPerUnit;
      const minStockValue = item.minQuantity * item.costPerUnit;
      const isLow = item.quantity <= item.minQuantity;
      const isOut = item.quantity <= 0;
      const isOverstocked = item.quantity > item.minQuantity * 3 && item.minQuantity > 0;
      return {
        id: item.id,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        costPerUnit: item.costPerUnit,
        stockValue: Math.round(stockValue * 100) / 100,
        minStockValue: Math.round(minStockValue * 100) / 100,
        category: item.category,
        supplier: item.supplier,
        isLow,
        isOut,
        isOverstocked,
      };
    });

    // Skupne metrike
    const totalStockValue = valuedItems.reduce((s, i) => s + i.stockValue, 0);
    const totalItems = valuedItems.length;
    const lowStockValue = valuedItems.filter((i) => i.isLow).reduce((s, i) => s + i.stockValue, 0);
    const outOfStockValue = valuedItems.filter((i) => i.isOut).length;
    const lowStockCount = valuedItems.filter((i) => i.isLow && !i.isOut).length;
    const overstockedCount = valuedItems.filter((i) => i.isOverstocked).length;

    // Vrednost po kategorijah
    const byCategory: Record<string, { value: number; count: number; quantity: number }> = {};
    for (const item of valuedItems) {
      const cat = item.category || "Brez kategorije";
      if (!byCategory[cat]) byCategory[cat] = { value: 0, count: 0, quantity: 0 };
      byCategory[cat].value += item.stockValue;
      byCategory[cat].count++;
      byCategory[cat].quantity += item.quantity;
    }

    const categoryStats = Object.entries(byCategory)
      .map(([category, v]) => ({
        category,
        value: Math.round(v.value * 100) / 100,
        count: v.count,
        quantity: Math.round(v.quantity * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value);

    // Vrednost po dobaviteljih
    const bySupplier: Record<string, { value: number; count: number }> = {};
    for (const item of valuedItems) {
      const sup = item.supplier || "Brez dobavitelja";
      if (!bySupplier[sup]) bySupplier[sup] = { value: 0, count: 0 };
      bySupplier[sup].value += item.stockValue;
      bySupplier[sup].count++;
    }

    const supplierStats = Object.entries(bySupplier)
      .map(([supplier, v]) => ({
        supplier,
        value: Math.round(v.value * 100) / 100,
        count: v.count,
      }))
      .sort((a, b) => b.value - a.value);

    // Top 10 najdražjih artiklov
    const topValueItems = [...valuedItems]
      .sort((a, b) => b.stockValue - a.stockValue)
      .slice(0, 10);

    return NextResponse.json({
      summary: {
        totalStockValue: Math.round(totalStockValue * 100) / 100,
        totalItems,
        lowStockCount,
        outOfStockCount: outOfStockValue,
        overstockedCount,
        lowStockValue: Math.round(lowStockValue * 100) / 100,
        avgItemValue: totalItems > 0 ? Math.round((totalStockValue / totalItems) * 100) / 100 : 0,
      },
      categoryStats,
      supplierStats,
      topValueItems,
      allItems: valuedItems.sort((a, b) => b.stockValue - a.stockValue),
    });
  } catch (e) {
    console.error("GET /api/inventory/valuation error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
