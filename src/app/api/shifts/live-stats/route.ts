import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// Vrne live prihodek aktivne smene (za dashboard polling) — per restavracija
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const shift = await db.shift.findFirst({
      where: { status: "open", restaurantId: tenant.id },
      orderBy: { startTime: "desc" },
    });

    if (!shift) {
      return NextResponse.json({
        shift: null,
        revenue: 0,
        ordersCount: 0,
        cashRevenue: 0,
        cardRevenue: 0,
        tips: 0,
      });
    }

    const paidOrders = await db.order.findMany({
      where: {
        status: "paid",
        restaurantId: tenant.id,
        paidAt: { gte: shift.startTime },
      },
      select: { total: true, paymentMethod: true, tip: true },
    });

    const revenue = paidOrders.reduce((s, o) => s + o.total, 0);
    const tips = paidOrders.reduce((s, o) => s + (o.tip || 0), 0);
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
      tips,
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
