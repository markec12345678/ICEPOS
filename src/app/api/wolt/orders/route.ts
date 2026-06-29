import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/wolt/orders — vrne Wolt naročila (iz naše baze, ki imajo operator "Wolt:...")
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    // Pridobi vsa naročila kjer operator vsebuje "Wolt"
    const orders = await db.order.findMany({
      where: {
        restaurantId: tenant.id,
        operator: { contains: "Wolt" },
      },
      include: {
        table: true,
        items: { include: { menuItem: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(orders);
  } catch (e) {
    console.error("GET /api/wolt/orders error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
