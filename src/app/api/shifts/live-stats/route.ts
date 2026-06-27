import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Vrne live prihodek aktivne smene (za dashboard polling)
export async function GET() {
  try {
    const shift = await db.shift.findFirst({
      where: { status: "open" },
      orderBy: { startTime: "desc" },
    });

    if (!shift) {
      return NextResponse.json({
        shift: null,
        revenue: 0,
        ordersCount: 0,
        cashRevenue: 0,
        cardRevenue: 0,
      });
    }

    const paidOrders = await db.order.findMany({
      where: {
        status: "paid",
        paidAt: { gte: shift.startTime },
      },
      select: { total: true, paymentMethod: true },
    });

    const revenue = paidOrders.reduce((s, o) => s + o.total, 0);
    const cashRevenue = paidOrders
      .filter((o) => o.paymentMethod === "cash")
      .reduce((s, o) => s + o.total, 0);
    const cardRevenue = paidOrders
      .filter((o) => o.paymentMethod === "card")
      .reduce((s, o) => s + o.total, 0);

    return NextResponse.json({
      shift: {
        id: shift.id,
        operator: shift.operator,
        startTime: shift.startTime,
        startCash: shift.startCash,
      },
      revenue,
      ordersCount: paidOrders.length,
      cashRevenue,
      cardRevenue,
      expectedCash: shift.startCash + cashRevenue,
    });
  } catch (e) {
    console.error("GET /api/shifts/live-stats error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
