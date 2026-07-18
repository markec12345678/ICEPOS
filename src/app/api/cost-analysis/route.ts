import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/cost-analysis — analiza stroškov jedi na podlagi receptov in zaloge
// Vrne za vsako jed: food cost, food cost %, marža, dobiček na enoto, primerjava dobaviteljev
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    // Pridobi vse jedi z recepti in inventory postavkami
    const menuItems = await db.menuItem.findMany({
      where: { restaurantId: tenant.id },
      include: {
        recipes: {
          include: {
            inventoryItem: true,
          },
        },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // Pridobi vse dobavitelje za primerjavo
    const suppliers = await db.supplier.findMany({
      where: { restaurantId: tenant.id, active: true },
      orderBy: { name: "asc" },
    });

    const items = menuItems.map((item) => {
      // Izračunaj food cost iz receptov
      const ingredients = item.recipes.map((r) => ({
        name: r.inventoryItem.name,
        quantity: r.quantity,
        unit: r.inventoryItem.unit,
        costPerUnit: r.inventoryItem.costPerUnit,
        lineCost: r.quantity * r.inventoryItem.costPerUnit,
        supplier: r.inventoryItem.supplier,
      }));

      const foodCost = ingredients.reduce((sum, ing) => sum + ing.lineCost, 0);
      const foodCostPct = item.price > 0 ? (foodCost / item.price) * 100 : 0;
      const profitPerUnit = item.price - foodCost;
      const profitMarginPct = item.price > 0 ? (profitPerUnit / item.price) * 100 : 0;

      // Oznaka zdravja marže
      let health: "healthy" | "warning" | "critical" = "healthy";
      if (foodCostPct > 40) health = "warning";
      if (foodCostPct > 60) health = "critical";

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        foodCost,
        foodCostPct,
        profitPerUnit,
        profitMarginPct,
        health,
        ingredients,
        hasRecipe: item.recipes.length > 0,
        available: item.available,
      };
    });

    // Povzetek po kategorijah
    const categories = items.reduce(
      (acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = {
            category: item.category,
            count: 0,
            totalFoodCost: 0,
            totalRevenue: 0,
            totalProfit: 0,
            avgFoodCostPct: 0,
          };
        }
        acc[item.category].count++;
        acc[item.category].totalFoodCost += item.foodCost;
        acc[item.category].totalRevenue += item.price;
        acc[item.category].totalProfit += item.profitPerUnit;
        return acc;
      },
      {} as Record<string, {
        category: string;
        count: number;
        totalFoodCost: number;
        totalRevenue: number;
        totalProfit: number;
        avgFoodCostPct: number;
      }>
    );

    const categorySummary = Object.values(categories).map((c) => ({
      ...c,
      avgFoodCostPct: c.totalRevenue > 0 ? (c.totalFoodCost / c.totalRevenue) * 100 : 0,
    }));

    const summary = {
      totalItems: items.length,
      itemsWithRecipe: items.filter((i) => i.hasRecipe).length,
      itemsWithoutRecipe: items.filter((i) => !i.hasRecipe).length,
      avgFoodCostPct: items.length > 0
        ? items.reduce((sum, i) => sum + i.foodCostPct, 0) / items.length
        : 0,
      avgProfitMargin: items.length > 0
        ? items.reduce((sum, i) => sum + i.profitMarginPct, 0) / items.length
        : 0,
      healthyCount: items.filter((i) => i.health === "healthy").length,
      warningCount: items.filter((i) => i.health === "warning").length,
      criticalCount: items.filter((i) => i.health === "critical").length,
      totalSuppliers: suppliers.length,
    };

    return NextResponse.json({
      items,
      categorySummary,
      summary,
      suppliers: suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        discountPercent: s.discountPercent,
        paymentTerms: s.paymentTerms,
      })),
    });
  } catch (e) {
    console.error("GET /api/cost-analysis error:", e);
    return NextResponse.json({ error: "Napaka pri analizi stroškov" }, { status: 500 });
  }
}
