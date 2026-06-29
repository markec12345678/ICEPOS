import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// Vrne zadnje plačano naročilo (za quick reorder) — per restavracija
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const lastOrder = await db.order.findFirst({
      where: { status: "paid", restaurantId: tenant.id },
      include: {
        table: true,
        items: { include: { menuItem: true } },
      },
      orderBy: { paidAt: "desc" },
    });

    if (!lastOrder) {
      return NextResponse.json({ order: null });
    }

    return NextResponse.json({
      order: {
        id: lastOrder.id,
        invoiceNumber: lastOrder.invoiceNumber,
        tableName: lastOrder.table.name,
        total: lastOrder.total,
        paidAt: lastOrder.paidAt,
        items: lastOrder.items.map((it) => ({
          menuItemId: it.menuItemId,
          name: it.menuItem.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          available: it.menuItem.available,
        })),
      },
    });
  } catch (e) {
    console.error("GET /api/orders/last error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
