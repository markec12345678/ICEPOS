import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/inventory/consumption?days=30 — analiza porabe sestavin
// Izračuna porabo iz prodanih jedi + receptov + waste logov
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const days = Math.min(parseInt(req.nextUrl.searchParams.get("days") || "30", 10), 90);
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Pridobi vse recepte (povezave meni postavk z inventarjem)
    const recipes = await db.recipe.findMany({
      where: { menuItem: { restaurantId: tenant.id } },
      include: {
        menuItem: { select: { id: true, name: true, category: true } },
        inventoryItem: { select: { id: true, name: true, unit: true, costPerUnit: true } },
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
        unitPrice: true,
        order: { select: { paidAt: true } },
      },
    });

    // Pridobi waste loge
    const wasteLogs = await db.wasteLog.findMany({
      where: {
        restaurantId: tenant.id,
        createdAt: { gte: since },
      },
      include: {
        inventoryItem: { select: { id: true, name: true, unit: true, costPerUnit: true } },
        menuItem: { select: { id: true, name: true } },
      },
    });

    // Izračunaj porabo po sestavinah
    const consumptionByItem: Record<string, {
      inventoryItemId: string;
      inventoryItemName: string;
      unit: string;
      costPerUnit: number;
      consumedQuantity: number;
      consumedValue: number;
      wastedQuantity: number;
      wastedValue: number;
      totalQuantity: number;
      totalValue: number;
    }> = {};

    // 1. Poraba iz prodaje (preko receptov)
    for (const item of orderItems) {
      const itemRecipes = recipes.filter((r) => r.menuItemId === item.menuItemId);
      for (const recipe of itemRecipes) {
        const inv = recipe.inventoryItem;
        if (!inv) continue;
        const consumedQty = recipe.quantity * item.quantity;
        const consumedVal = consumedQty * inv.costPerUnit;

        if (!consumptionByItem[inv.id]) {
          consumptionByItem[inv.id] = {
            inventoryItemId: inv.id,
            inventoryItemName: inv.name,
            unit: inv.unit,
            costPerUnit: inv.costPerUnit,
            consumedQuantity: 0,
            consumedValue: 0,
            wastedQuantity: 0,
            wastedValue: 0,
            totalQuantity: 0,
            totalValue: 0,
          };
        }
        consumptionByItem[inv.id].consumedQuantity += consumedQty;
        consumptionByItem[inv.id].consumedValue += consumedVal;
      }
    }

    // 2. Odpadki (waste)
    for (const waste of wasteLogs) {
      const inv = waste.inventoryItem;
      if (!inv) continue;
      if (!consumptionByItem[inv.id]) {
        consumptionByItem[inv.id] = {
          inventoryItemId: inv.id,
          inventoryItemName: inv.name,
          unit: inv.unit,
          costPerUnit: inv.costPerUnit,
          consumedQuantity: 0,
          consumedValue: 0,
          wastedQuantity: 0,
          wastedValue: 0,
          totalQuantity: 0,
          totalValue: 0,
        };
      }
      consumptionByItem[inv.id].wastedQuantity += waste.quantity;
      consumptionByItem[inv.id].wastedValue += waste.quantity * inv.costPerUnit;
    }

    // Izračunaj skupne količine in vrednosti
    const items = Object.values(consumptionByItem).map((item) => {
      item.totalQuantity = item.consumedQuantity + item.wastedQuantity;
      item.totalValue = item.consumedValue + item.wastedValue;
      return {
        ...item,
        consumedQuantity: Math.round(item.consumedQuantity * 100) / 100,
        consumedValue: Math.round(item.consumedValue * 100) / 100,
        wastedQuantity: Math.round(item.wastedQuantity * 100) / 100,
        wastedValue: Math.round(item.wastedValue * 100) / 100,
        totalQuantity: Math.round(item.totalQuantity * 100) / 100,
        totalValue: Math.round(item.totalValue * 100) / 100,
        wastePct: item.totalValue > 0
          ? Math.round((item.wastedValue / item.totalValue) * 1000) / 10
          : 0,
      };
    }).sort((a, b) => b.totalValue - a.totalValue);

    // Skupne metrike
    const totalConsumedValue = items.reduce((s, i) => s + i.consumedValue, 0);
    const totalWastedValue = items.reduce((s, i) => s + i.wastedValue, 0);
    const totalValue = totalConsumedValue + totalWastedValue;
    const wasteRate = totalValue > 0 ? Math.round((totalWastedValue / totalValue) * 1000) / 10 : 0;

    // Top 5 po porabi
    const topConsumed = [...items].sort((a, b) => b.consumedValue - a.consumedValue).slice(0, 5);

    // Top 5 po odpadkih
    const topWasted = items.filter((i) => i.wastedValue > 0).sort((a, b) => b.wastedValue - a.wastedValue).slice(0, 5);

    // Poraba po dnevih (zadnjih 7 dni)
    const last7Days: { date: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayItems = orderItems.filter((oi) => {
        if (!oi.order.paidAt) return false;
        return oi.order.paidAt.toISOString().slice(0, 10) === dateStr;
      });
      let dayValue = 0;
      for (const item of dayItems) {
        const itemRecipes = recipes.filter((r) => r.menuItemId === item.menuItemId);
        for (const recipe of itemRecipes) {
          dayValue += recipe.quantity * item.quantity * (recipe.inventoryItem?.costPerUnit || 0);
        }
      }
      last7Days.push({
        date: dateStr,
        value: Math.round(dayValue * 100) / 100,
      });
    }

    return NextResponse.json({
      summary: {
        totalConsumedValue: Math.round(totalConsumedValue * 100) / 100,
        totalWastedValue: Math.round(totalWastedValue * 100) / 100,
        totalValue: Math.round(totalValue * 100) / 100,
        wasteRate,
        itemCount: items.length,
      },
      items,
      topConsumed,
      topWasted,
      last7Days,
      days,
    });
  } catch (e) {
    console.error("GET /api/inventory/consumption error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
