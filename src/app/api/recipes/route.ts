import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Vsi recepti z vključenim menuItem in inventoryItem
export async function GET() {
  try {
    const recipes = await db.recipe.findMany({
      include: {
        menuItem: true,
        inventoryItem: true,
      },
      orderBy: [{ menuItem: { name: "asc" } }, { inventoryItem: { name: "asc" } }],
    });
    return NextResponse.json(recipes);
  } catch (e) {
    console.error("GET /api/recipes error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// Nov recept (samo admin)
export async function POST(req: NextRequest) {
  try {
    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko upravlja recepte" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { menuItemId, inventoryItemId, quantity } = body as {
      menuItemId: string;
      inventoryItemId: string;
      quantity: number;
    };

    if (!menuItemId || !inventoryItemId || typeof quantity !== "number") {
      return NextResponse.json(
        { error: "Manjkajoči podatki (menuItemId, inventoryItemId, quantity)" },
        { status: 400 }
      );
    }

    // Preveri, da obe entiteti obstajata
    const [menu, inv] = await Promise.all([
      db.menuItem.findUnique({ where: { id: menuItemId } }),
      db.inventoryItem.findUnique({ where: { id: inventoryItemId } }),
    ]);
    if (!menu) {
      return NextResponse.json(
        { error: "Postavka menija ne obstaja" },
        { status: 404 }
      );
    }
    if (!inv) {
      return NextResponse.json(
        { error: "Inventarni izdelek ne obstaja" },
        { status: 404 }
      );
    }

    const recipe = await db.recipe.create({
      data: { menuItemId, inventoryItemId, quantity },
      include: { menuItem: true, inventoryItem: true },
    });
    return NextResponse.json(recipe, { status: 201 });
  } catch (e) {
    console.error("POST /api/recipes error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
