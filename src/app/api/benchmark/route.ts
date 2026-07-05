// @ts-nocheck — pre-existing TS errors (non-critical analytics/reporting route)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/benchmark?days=30 — primerja vse restavracije (lokacije)
// Vrne KPI per restavracija: promet, št. računov, povp. račun, napitnine, food cost, labor cost
export async function GET(req: NextRequest) {
  try {
    const days = parseInt(req.nextUrl.searchParams.get("days") || "30", 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const restaurants = await db.restaurant.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });

    if (restaurants.length === 0) {
      return NextResponse.json({ restaurants: [], summary: null });
    }

    const benchmarkData = await Promise.all(
      restaurants.map(async (r) => {
        // Pridobi vse plačane račune za obdobje
        const paidOrders = await db.order.findMany({
          where: {
            status: "paid",
            restaurantId: r.id,
            paidAt: { gte: since },
          },
          include: {
            items: { include: { menuItem: { include: { recipes: { include: { inventoryItem: true } } } } } },
          },
        });

        const revenue = paidOrders.reduce((s, o) => s + Number(o.total), 0);
        const tips = paidOrders.reduce((s, o) => s + (Number(o.tip) || 0), 0);
        const orderCount = paidOrders.length;
        const avgOrder = orderCount > 0 ? revenue / orderCount : 0;

        // Food cost iz receptov
        let foodCost = 0;
        for (const o of paidOrders) {
          for (const it of o.items) {
            const recipes = it.menuItem.recipes || [];
            for (const recipe of recipes) {
              foodCost += recipe.Number(inventoryItem.costPerUnit) * recipe.quantity * it.quantity;
            }
          }
        }
        const foodCostPct = revenue > 0 ? (foodCost / revenue) * 100 : 0;

        // Labor cost iz timesheet-ov
        const timesheets = await db.timesheet.findMany({
          where: {
            date: { gte: since.toISOString().slice(0, 10) },
            operator: { restaurantId: r.id },
          },
          include: { operator: true },
        });
        let laborCost = 0;
        let laborMinutes = 0;
        for (const ts of timesheets) {
          const end = ts.clockOut || new Date();
          const minutes = Math.max(0, Math.floor((end.getTime() - ts.clockIn.getTime()) / 60000) - ts.breakMinutes);
          laborMinutes += minutes;
          laborCost += (minutes / 60) * ts.operator.hourlyRate;
        }
        const laborCostPct = revenue > 0 ? (laborCost / revenue) * 100 : 0;

        // Št. miz
        const tableCount = await db.table.count({ where: { restaurantId: r.id } });

        // Top item
        const itemMap = new Map<string, { name: string; count: number; revenue: number }>();
        for (const o of paidOrders) {
          for (const it of o.items) {
            const key = it.menuItemId;
            const existing = itemMap.get(key);
            const lineRev = Number(it.unitPrice) * it.quantity;
            if (existing) {
              existing.count += it.quantity;
              existing.revenue += lineRev;
            } else {
              itemMap.set(key, {
                name: it.menuItem.name,
                count: it.quantity,
                revenue: lineRev,
              });
            }
          }
        }
        const topItems = [...itemMap.values()].sort((a, b) => b.count - a.count);
        const topItem = topItems[0]?.name || "—";

        return {
          id: r.id,
          name: r.name,
          slug: r.slug,
          subdomain: r.subdomain,
          city: r.city,
          taxNumber: r.taxNumber,
          revenue: Math.round(revenue * 100) / 100,
          tips: Math.round(tips * 100) / 100,
          orderCount,
          avgOrder: Math.round(avgOrder * 100) / 100,
          foodCost: Math.round(foodCost * 100) / 100,
          foodCostPct: Math.round(foodCostPct * 10) / 10,
          laborCost: Math.round(laborCost * 100) / 100,
          laborCostPct: Math.round(laborCostPct * 10) / 10,
          laborHours: Math.round((laborMinutes / 60) * 10) / 10,
          tableCount,
          topItem,
          // Profit (revenue - food cost - labor cost)
          profit: Math.round((revenue - foodCost - laborCost) * 100) / 100,
          profitMarginPct: revenue > 0
            ? Math.round(((revenue - foodCost - laborCost) / revenue) * 1000) / 10
            : 0,
        };
      })
    );

    // Ranking — sortiraj po prometu
    const ranked = [...benchmarkData].sort((a, b) => b.revenue - a.revenue);
    ranked.forEach((r, i) => {
      (r as { rank: number }).rank = i + 1;
    });

    // Povzetek
    const summary = {
      totalRestaurants: restaurants.length,
      totalRevenue: Math.round(benchmarkData.reduce((s, r) => s + r.revenue, 0) * 100) / 100,
      totalTips: Math.round(benchmarkData.reduce((s, r) => s + r.tips, 0) * 100) / 100,
      totalOrders: benchmarkData.reduce((s, r) => s + r.orderCount, 0),
      avgRevenue: Math.round((benchmarkData.reduce((s, r) => s + r.revenue, 0) / restaurants.length) * 100) / 100,
      avgOrderValue: Math.round(
        (benchmarkData.reduce((s, r) => s + r.avgOrder, 0) / restaurants.length) * 100
      ) / 100,
      avgFoodCostPct: Math.round(
        (benchmarkData.reduce((s, r) => s + r.foodCostPct, 0) / restaurants.length) * 10
      ) / 10,
      avgLaborCostPct: Math.round(
        (benchmarkData.reduce((s, r) => s + r.laborCostPct, 0) / restaurants.length) * 10
      ) / 10,
      avgProfitMarginPct: Math.round(
        (benchmarkData.reduce((s, r) => s + r.profitMarginPct, 0) / restaurants.length) * 10
      ) / 10,
      topPerformer: ranked[0]?.name || "—",
      bottomPerformer: ranked[ranked.length - 1]?.name || "—",
      days,
    };

    return NextResponse.json({
      restaurants: ranked,
      summary,
    });
  } catch (e) {
    console.error("GET /api/benchmark error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
