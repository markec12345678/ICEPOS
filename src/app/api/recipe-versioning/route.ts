import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/recipe-versioning — pregled receptov z verzijami in spremembami
// Podpora za ?menuItemId=xxx (posamezna jed)
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const menuItemId = req.nextUrl.searchParams.get("menuItemId");

    // Pridobi vse recepte z inventory item-i
    const recipes = await db.recipe.findMany({
      where: menuItemId ? { menuItemId, menuItem: { restaurantId: tenant.id } } : { menuItem: { restaurantId: tenant.id } },
      include: {
        menuItem: true,
        inventoryItem: true,
      },
      orderBy: [{ menuItem: { name: "asc" } }, { createdAt: "desc" }],
    });

    // Grupiraj po meni item-u (vsaka jed ima trenutno verzijo recepta)
    const recipeMap = new Map<
      string,
      {
        menuItemId: string;
        menuItemName: string;
        category: string;
        price: number;
        ingredients: Array<{
          recipeId: string;
          inventoryItemId: string;
          ingredientName: string;
          quantity: number;
          unit: string;
          costPerUnit: number;
          lineCost: number;
          createdAt: string;
        }>;
        totalCost: number;
        foodCostPct: number;
        versionCount: number;
        lastModified: string;
      }
    >();

    for (const r of recipes) {
      const key = r.menuItemId;
      const existing = recipeMap.get(key);
      const ingredient = {
        recipeId: r.id,
        inventoryItemId: r.inventoryItemId,
        ingredientName: r.inventoryItem.name,
        quantity: r.quantity,
        unit: r.inventoryItem.unit,
        costPerUnit: r.inventoryItem.costPerUnit,
        lineCost: r.quantity * r.inventoryItem.costPerUnit,
        createdAt: r.createdAt.toISOString(),
      };

      if (existing) {
        existing.ingredients.push(ingredient);
        existing.totalCost += ingredient.lineCost;
        existing.foodCostPct = r.menuItem.price > 0 ? (existing.totalCost / r.menuItem.price) * 100 : 0;
        // Štej verzije kot unikatne dneve sprememb
        const dateKey = r.createdAt.toISOString().slice(0, 10);
        if (!existing.lastModified || r.createdAt.toISOString() > existing.lastModified) {
          existing.lastModified = r.createdAt.toISOString();
        }
      } else {
        recipeMap.set(key, {
          menuItemId: r.menuItemId,
          menuItemName: r.menuItem.name,
          category: r.menuItem.category,
          price: r.menuItem.price,
          ingredients: [ingredient],
          totalCost: ingredient.lineCost,
          foodCostPct: r.menuItem.price > 0 ? (ingredient.lineCost / r.menuItem.price) * 100 : 0,
          versionCount: 1,
          lastModified: r.createdAt.toISOString(),
        });
      }
    }

    const items = Array.from(recipeMap.values());

    // Povzetek
    const summary = {
      totalRecipes: items.length,
      totalIngredients: recipes.length,
      avgFoodCostPct: items.length > 0
        ? items.reduce((s, i) => s + i.foodCostPct, 0) / items.length
        : 0,
      totalFoodCost: items.reduce((s, i) => s + i.totalCost, 0),
      avgIngredientsPerRecipe: items.length > 0
        ? items.reduce((s, i) => s + i.ingredients.length, 0) / items.length
        : 0,
      recentlyModified: items.filter(
        (i) => new Date(i.lastModified) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length,
      highFoodCost: items.filter((i) => i.foodCostPct > 40).length,
      criticalFoodCost: items.filter((i) => i.foodCostPct > 60).length,
    };

    // Če je menuItemId podan, dodaj tudi "verzije" (zgodovina sprememb po datumih)
    let versionHistory: Array<{ date: string; changes: number; ingredients: string[] }> = [];
    if (menuItemId) {
      const targetRecipes = recipes.filter((r) => r.menuItemId === menuItemId);
      const dateMap = new Map<string, { date: string; changes: number; ingredients: string[] }>();
      for (const r of targetRecipes) {
        const dateKey = r.createdAt.toISOString().slice(0, 10);
        const existing = dateMap.get(dateKey);
        if (existing) {
          existing.changes++;
          existing.ingredients.push(r.inventoryItem.name);
        } else {
          dateMap.set(dateKey, {
            date: dateKey,
            changes: 1,
            ingredients: [r.inventoryItem.name],
          });
        }
      }
      versionHistory = Array.from(dateMap.values()).sort((a, b) => b.date.localeCompare(a.date));
    }

    return NextResponse.json({
      items,
      summary,
      versionHistory,
    });
  } catch (e) {
    console.error("GET /api/recipe-versioning error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju verzij receptov" }, { status: 500 });
  }
}
