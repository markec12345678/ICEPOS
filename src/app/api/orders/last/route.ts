import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Vrne zadnje plačano naročilo (za quick reorder)
export async function GET() {
  try {
    const lastOrder = await db.order.findFirst({
      where: { status: "paid" },
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
