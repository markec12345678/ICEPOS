import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Vrne status naročila za gosta (za sledenje po oddaji)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await db.order.findUnique({
      where: { id },
      include: {
        table: true,
        items: { include: { menuItem: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Naročilo ni najdeno" }, { status: 404 });
    }

    // Določi status za gosta
    let guestStatus: "received" | "preparing" | "ready" | "paid" = "received";
    if (order.status === "paid") {
      guestStatus = "paid";
    } else if (order.status === "open") {
      // Preveri ali je v kuhinji (pošlji v kuhinjo = kitchen-service ve)
      // Za demo: preveri ali je minilo > 30s od ustvarjanja = "preparing"
      const ageMs = Date.now() - new Date(order.createdAt).getTime();
      if (ageMs > 30000) {
        guestStatus = "preparing";
      } else {
        guestStatus = "received";
      }
    }

    return NextResponse.json({
      orderId: order.id,
      status: guestStatus,
      orderStatus: order.status,
      table: order.table.name,
      total: order.total,
      itemCount: order.items.length,
      items: order.items.map((it) => ({
        name: it.menuItem.name,
        quantity: it.quantity,
      })),
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      isGuestOrder: order.operator.includes("Gost"),
    });
  } catch (e) {
    console.error("GET /api/orders/guest/[id]/status error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
