import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/deliverect/orders — vrne vsa Deliverect naročila (vse kanale)
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    // Vsa naročila kjer operator vsebuje "Deliverect"
    const orders = await db.order.findMany({
      where: {
        restaurantId: tenant.id,
        operator: { contains: "Deliverect" },
      },
      include: {
        table: true,
        items: { include: { menuItem: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(orders);
  } catch (e) {
    console.error("GET /api/deliverect/orders error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
