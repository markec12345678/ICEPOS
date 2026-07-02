import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/inventory/smart-reorder — pametni predlogi naročil
// Upošteva: porabo v zadnjih 30 dneh, lead time, trenutno zalogo, min količino
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const days = parseInt(req.nextUrl.searchParams.get("days") || "30", 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Pridobi vse artikle z zalogo
    const items = await db.inventoryItem.findMany({
      where: { restaurantId: tenant.id },
      orderBy: { name: "asc" },
    });

    // Pridobi vse recepte (povezave meni postavk z inventarjem)
    const recipes = await db.recipe.findMany({
      where: { menuItem: { restaurantId: tenant.id } },
      include: {
        menuItem: { select: { id: true, name: true } },
        inventoryItem: { select: { id: true } },
      },
    });

    // Pridobi vse prodane postavke v obdobju
    const orderItems = await db.orderItem.findMany({
      where: {
        order: {
          restaurantId: tenant.id,
          status: "paid",
          paidAt: { gte: since },
        },
      },
      select: {
        menuItemId: true,
        quantity: true,
        order: { select: { paidAt: true } },
      },
    });

    // Izračunaj dnevno porabo per inventar item
    const consumptionByItem: Record<string, { totalQty: number; dailyAvg: number }> = {};

    for (const oi of orderItems) {
      const itemRecipes = recipes.filter((r) => r.menuItemId === oi.menuItemId);
      for (const recipe of itemRecipes) {
        const invId = recipe.inventoryItemId;
        if (!invId) continue;
        const consumedQty = recipe.quantity * oi.quantity;
        if (!consumptionByItem[invId]) {
          consumptionByItem[invId] = { totalQty: 0, dailyAvg: 0 };
        }
        consumptionByItem[invId].totalQty += consumedQty;
      }
    }

    // Izračunaj dnevno povprečje
    for (const invId of Object.keys(consumptionByItem)) {
      consumptionByItem[invId].dailyAvg = consumptionByItem[invId].totalQty / days;
    }

    // Pridobi odpadke
    const wasteLogs = await db.wasteLog.findMany({
      where: {
        restaurantId: tenant.id,
        createdAt: { gte: since },
      },
      select: { inventoryItemId: true, quantity: true },
    });

    const wasteByItem: Record<string, number> = {};
    for (const w of wasteLogs) {
      if (w.inventoryItemId) {
        wasteByItem[w.inventoryItemId] = (wasteByItem[w.inventoryItemId] || 0) + w.quantity;
      }
    }

    // Ustvari predloge
    const suggestions = items
      .map((item) => {
        const consumption = consumptionByItem[item.id] || { totalQty: 0, dailyAvg: 0 };
        const waste = wasteByItem[item.id] || 0;
        const dailyAvgWithWaste = consumption.dailyAvg + (waste / days);

        // Lead time: privzeto 3 dni (lahko bi bilo per dobavitelj)
        const leadTimeDays = 3;

        // Days until stockout
        const daysUntilStockout = dailyAvgWithWaste > 0
          ? Math.floor(item.quantity / dailyAvgWithWaste)
          : 999;

        // Reorder point: min količina ALI 3 dni porabe (kar večje)
        const reorderPoint = Math.max(item.minQuantity, dailyAvgWithWaste * leadTimeDays);

        // Suggested order quantity: 14 dni porabe - trenutna zaloga
        const suggestedQty = Math.max(0, Math.ceil(dailyAvgWithWaste * 14 - item.quantity));

        // Priority
        let priority: "critical" | "high" | "medium" | "low" = "low";
        if (item.quantity <= 0) priority = "critical";
        else if (daysUntilStockout <= leadTimeDays) priority = "critical";
        else if (daysUntilStockout <= leadTimeDays + 2) priority = "high";
        else if (daysUntilStockout <= 7) priority = "medium";

        // Ali potrebujemo naročilo?
        const needsReorder = priority === "critical" || priority === "high" ||
          (item.quantity <= reorderPoint);

        return {
          id: item.id,
          name: item.name,
          unit: item.unit,
          category: item.category,
          supplier: item.supplier,
          currentQty: item.quantity,
          minQty: item.minQuantity,
          costPerUnit: item.costPerUnit,
          dailyAvg: Math.round(dailyAvgWithWaste * 100) / 100,
          totalConsumed: Math.round(consumption.totalQty * 100) / 100,
          wasteQty: Math.round(waste * 100) / 100,
          daysUntilStockout,
          reorderPoint: Math.round(reorderPoint * 100) / 100,
          suggestedQty,
          suggestedValue: Math.round(suggestedQty * item.costPerUnit * 100) / 100,
          priority,
          needsReorder,
          leadTimeDays,
        };
      })
      .filter((s) => s.needsReorder && s.dailyAvg > 0)
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority] ||
          a.daysUntilStockout - b.daysUntilStockout;
      });

    // Skupne metrike
    const criticalCount = suggestions.filter((s) => s.priority === "critical").length;
    const highCount = suggestions.filter((s) => s.priority === "high").length;
    const totalSuggestedValue = suggestions.reduce((s, i) => s + i.suggestedValue, 0);

    return NextResponse.json({
      suggestions,
      summary: {
        totalItems: items.length,
        needsReorder: suggestions.length,
        criticalCount,
        highCount,
        totalSuggestedValue: Math.round(totalSuggestedValue * 100) / 100,
        days,
      },
    });
  } catch (e) {
    console.error("GET /api/inventory/smart-reorder error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
