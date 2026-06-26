import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Zaključi smeno — izračuna prihodek, število računov, shrani endCash
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const endCash: number | undefined =
      typeof body.endCash === "number" ? body.endCash : undefined;
    const note: string | undefined =
      typeof body.note === "string" ? body.note.slice(0, 500) : undefined;

    const shift = await db.shift.findUnique({ where: { id } });
    if (!shift) {
      return NextResponse.json({ error: "Smena ni najdena" }, { status: 404 });
    }
    if (shift.status === "closed") {
      return NextResponse.json({ error: "Smena je že zaključena" }, { status: 400 });
    }

    // Izračunaj prihodek in število računov za to smeno
    const paidOrders = await db.order.findMany({
      where: {
        status: "paid",
        paidAt: { gte: shift.startTime, lte: new Date() },
      },
      select: { total: true, paymentMethod: true },
    });

    const totalRevenue = paidOrders.reduce((s, o) => s + o.total, 0);
    const cashRevenue = paidOrders
      .filter((o) => o.paymentMethod === "cash")
      .reduce((s, o) => s + o.total, 0);

    const closed = await db.shift.update({
      where: { id },
      data: {
        status: "closed",
        endTime: new Date(),
        endCash: endCash ?? shift.startCash + cashRevenue,
        totalRevenue,
        ordersCount: paidOrders.length,
        note,
      },
    });

    return NextResponse.json({
      shift: closed,
      summary: {
        totalRevenue,
        ordersCount: paidOrders.length,
        cashRevenue,
        cardRevenue: totalRevenue - cashRevenue,
        expectedCash: shift.startCash + cashRevenue,
        difference: (endCash ?? shift.startCash + cashRevenue) - (shift.startCash + cashRevenue),
      },
    });
  } catch (e) {
    console.error("POST /api/shifts/[id]/close error:", e);
    return NextResponse.json({ error: "Napaka pri zaključevanju smene" }, { status: 500 });
  }
}
