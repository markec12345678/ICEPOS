import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/inventory/out-of-stock — artikli z zalogo 0 (kritično)
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const items = await db.inventoryItem.findMany({
      where: {
        restaurantId: tenant.id,
        quantity: {
          lte: 0,
        },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        unit: true,
        quantity: true,
        minQuantity: true,
        costPerUnit: true,
        supplier: true,
        category: true,
      },
    });

    return NextResponse.json(items);
  } catch (e) {
    console.error("GET /api/inventory/out-of-stock error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
