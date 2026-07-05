import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// Zaključi smeno — izračuna prihodek, število računov, shrani endCash
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const endCash: number | undefined =
      typeof body.endCash === "number" ? body.endCash : undefined;
    const note: string | undefined =
      typeof body.note === "string" ? body.note.slice(0, 500) : undefined;

    const shift = await db.shift.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!shift) {
      return NextResponse.json({ error: "Smena ni najdena" }, { status: 404 });
    }
    if (shift.status === "closed") {
      return NextResponse.json({ error: "Smena je že zaključena" }, { status: 400 });
    }

    // Izračunaj prihodek in število računov za to smeno (samo za to restavracijo)
    const paidOrders = await db.order.findMany({
      where: {
        status: "paid",
        restaurantId: tenant.id,
        paidAt: { gte: shift.startTime, lte: new Date() },
      },
      select: { total: true, paymentMethod: true, tip: true },
    });

    const totalRevenue = paidOrders.reduce((s, o) => s + Number(o.total), 0);
    const totalTips = paidOrders.reduce((s, o) => s + (Number(o.tip) || 0), 0);
    const cashRevenue = paidOrders
      .filter((o) => o.paymentMethod === "cash")
      .reduce((s, o) => s + Number(o.total), 0);

    const closed = await db.shift.update({
      where: { id },
      data: {
        status: "closed",
        endTime: new Date(),
        endCash: endCash ?? Number(shift.startCash) + cashRevenue,
        totalRevenue,
        ordersCount: paidOrders.length,
        note,
      },
    });

    return NextResponse.json({
      shift: closed,
      summary: {
        totalRevenue,
        totalTips,
        ordersCount: paidOrders.length,
        cashRevenue,
        cardRevenue: totalRevenue - cashRevenue,
        expectedCash: Number(shift.startCash) + cashRevenue,
        difference: (endCash ?? Number(shift.startCash) + cashRevenue) - (Number(shift.startCash) + cashRevenue),
      },
    });
  } catch (e) {
    console.error("POST /api/shifts/[id]/close error:", e);
    return NextResponse.json({ error: "Napaka pri zaključevanju smene" }, { status: 500 });
  }
}
