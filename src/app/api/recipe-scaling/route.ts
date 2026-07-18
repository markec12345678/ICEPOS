import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/recipe-scaling — preračun receptov za X porcij + nakupni seznam
// Podpora za ?menuItemId=xxx&portions=50 ali ?all=true&portions=20
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const menuItemId = req.nextUrl.searchParams.get("menuItemId");
    const portionsParam = req.nextUrl.searchParams.get("portions");
    const all = req.nextUrl.searchParams.get("all") === "true";

    const portions = portionsParam ? parseInt(portionsParam, 10) : 10;
    if (isNaN(portions) || portions <= 0) {
      return NextResponse.json({ error: "Število porcij mora biti pozitivno število" }, { status: 400 });
    }

    // Če je menuItemId podan — preračunaj samo za eno jed
    if (menuItemId) {
      const menuItem = await db.menuItem.findFirst({
        where: { id: menuItemId, restaurantId: tenant.id },
        include: {
          recipes: {
            include: {
              inventoryItem: true,
            },
          },
        },
      });

      if (!menuItem) {
        return NextResponse.json({ error: "Jed ni najdena" }, { status: 404 });
      }

      const scaled = scaleRecipe(menuItem, portions);
      return NextResponse.json(scaled);
    }

    // Če je all=true — preračunaj za vse jedi z recepti
    const where = all
      ? { restaurantId: tenant.id }
      : { restaurantId: tenant.id, recipes: { some: {} } };

    const menuItems = await db.menuItem.findMany({
      where,
      include: {
        recipes: {
          include: {
            inventoryItem: true,
          },
        },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    const scaledItems = menuItems
      .filter((m) => m.recipes.length > 0)
      .map((m) => scaleRecipe(m, portions));

    // Skupni nakupni seznam (agregacija vseh sestavin)
    const shoppingList = new Map<
      string,
      {
        name: string;
        unit: string;
        totalQuantity: number;
        costPerUnit: number;
        totalCost: number;
        supplier: string | null;
        currentStock: number;
        needed: number; // količina, ki manjka
      }
    >();

    for (const item of scaledItems) {
      for (const ing of item.ingredients) {
        const existing = shoppingList.get(ing.inventoryItemId);
        if (existing) {
          existing.totalQuantity += ing.scaledQuantity;
          existing.totalCost += ing.scaledCost;
          const need = Math.max(0, existing.totalQuantity - existing.currentStock);
          existing.needed = need;
        } else {
          const need = Math.max(0, ing.scaledQuantity - ing.currentStock);
          shoppingList.set(ing.inventoryItemId, {
            name: ing.name,
            unit: ing.unit,
            totalQuantity: ing.scaledQuantity,
            costPerUnit: ing.costPerUnit,
            totalCost: ing.scaledCost,
            supplier: ing.supplier,
            currentStock: ing.currentStock,
            needed: need,
          });
        }
      }
    }

    const totalFoodCost = scaledItems.reduce((s, i) => s + i.foodCost, 0);

    return NextResponse.json({
      portions,
      items: scaledItems,
      shoppingList: Array.from(shoppingList.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
      summary: {
        totalItems: scaledItems.length,
        totalPortions: scaledItems.reduce((s, i) => s + portions, 0),
        totalFoodCost,
        costPerPortion: scaledItems.length > 0 ? totalFoodCost / (scaledItems.length * portions) : 0,
        shoppingItems: shoppingList.size,
        itemsToBuy: Array.from(shoppingList.values()).filter((s) => s.needed > 0).length,
        totalShoppingCost: Array.from(shoppingList.values()).reduce((s, i) => s + i.needed * i.costPerUnit, 0),
      },
    });
  } catch (e) {
    console.error("GET /api/recipe-scaling error:", e);
    return NextResponse.json({ error: "Napaka pri preračunu receptov" }, { status: 500 });
  }
}

interface ScaledIngredient {
  inventoryItemId: string;
  name: string;
  unit: string;
  baseQuantity: number; // količina na 1 porcijo
  scaledQuantity: number; // količina za X porcij
  costPerUnit: number;
  baseCost: number;
  scaledCost: number;
  supplier: string | null;
  currentStock: number;
}

interface ScaledRecipe {
  id: string;
  name: string;
  category: string;
  price: number;
  portions: number;
  baseFoodCost: number; // cena na 1 porcijo
  scaledFoodCost: number; // cena za X porcij
  ingredients: ScaledIngredient[];
}

function scaleRecipe(
  item: {
    id: string;
    name: string;
    category: string;
    price: number;
    recipes: Array<{
      quantity: number;
      inventoryItem: {
        id: string;
        name: string;
        unit: string;
        costPerUnit: number;
        supplier: string | null;
        quantity: number;
      };
    }>;
  },
  portions: number
): ScaledRecipe {
  const ingredients: ScaledIngredient[] = item.recipes.map((r) => ({
    inventoryItemId: r.inventoryItem.id,
    name: r.inventoryItem.name,
    unit: r.inventoryItem.unit,
    baseQuantity: r.quantity,
    scaledQuantity: r.quantity * portions,
    costPerUnit: r.inventoryItem.costPerUnit,
    baseCost: r.quantity * r.inventoryItem.costPerUnit,
    scaledCost: r.quantity * portions * r.inventoryItem.costPerUnit,
    supplier: r.inventoryItem.supplier,
    currentStock: r.inventoryItem.quantity,
  }));

  const baseFoodCost = ingredients.reduce((s, i) => s + i.baseCost, 0);
  const scaledFoodCost = ingredients.reduce((s, i) => s + i.scaledCost, 0);

  return {
    id: item.id,
    name: item.name,
    category: item.category,
    price: item.price,
    portions,
    baseFoodCost,
    scaledFoodCost,
    ingredients,
  };
}
