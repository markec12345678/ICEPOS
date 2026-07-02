import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// POST /api/shifts/handover — izmenjava smene med blagajniki
// Konča trenutno smeno in ustvari novo z drugim operaterjem
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      endCash,
      note,
      newOperatorId,
      newOperatorName,
      newOperatorTaxNo,
      startCash,
    } = body as {
      endCash?: number;
      note?: string;
      newOperatorId?: string;
      newOperatorName?: string;
      newOperatorTaxNo?: string;
      startCash?: number;
    };

    // Najdi aktivno smeno
    const activeShift = await db.shift.findFirst({
      where: {
        restaurantId: tenant.id,
        status: "open",
      },
      orderBy: { startTime: "desc" },
    });

    if (!activeShift) {
      return NextResponse.json(
        { error: "Ni aktivne smene za izmenjavo" },
        { status: 400 }
      );
    }

    // Pridobi operaterja za novo smeno
    let newOperator = null;
    if (newOperatorId) {
      newOperator = await db.operator.findFirst({
        where: {
          id: newOperatorId,
          restaurantId: tenant.id,
          active: true,
        },
      });
      if (!newOperator) {
        return NextResponse.json(
          { error: "Novi operater ni najden" },
          { status: 404 }
        );
      }
    }

    // Izračunaj prihodek in število računov za končano smeno
    const paidOrders = await db.order.findMany({
      where: {
        status: "paid",
        restaurantId: tenant.id,
        paidAt: { gte: activeShift.startTime, lte: new Date() },
      },
      select: { total: true, tip: true, paymentMethod: true },
    });

    const totalRevenue = paidOrders.reduce((s, o) => s + o.total, 0);
    const totalTips = paidOrders.reduce((s, o) => s + (o.tip || 0), 0);
    const ordersCount = paidOrders.length;
    const cashOrders = paidOrders.filter((o) => o.paymentMethod === "cash").length;
    const cardOrders = paidOrders.filter((o) => o.paymentMethod === "card").length;

    // 1. Zaključi trenutno smeno
    const closedShift = await db.shift.update({
      where: { id: activeShift.id },
      data: {
        status: "closed",
        endTime: new Date(),
        endCash: typeof endCash === "number" ? endCash : activeShift.startCash + totalRevenue,
        totalRevenue,
        ordersCount,
        note: note || `Izmenjava na: ${newOperator?.name || newOperatorName || "neznan"}`,
      },
    });

    // 2. Ustvari novo smeno z drugim operaterjem
    const newShift = await db.shift.create({
      data: {
        restaurantId: tenant.id,
        operator: newOperator?.name || newOperatorName || "Blagajnik",
        operatorTaxNo: newOperator?.taxNumber || newOperatorTaxNo || activeShift.operatorTaxNo,
        startCash: typeof startCash === "number" ? startCash : (typeof endCash === "number" ? endCash : activeShift.startCash + totalRevenue),
        status: "open",
      },
    });

    // Povzetek končane smene
    const summary = {
      closedShift: {
        id: closedShift.id,
        operator: closedShift.operator,
        startTime: closedShift.startTime,
        endTime: closedShift.endTime,
        duration: closedShift.endTime
          ? Math.round((closedShift.endTime.getTime() - closedShift.startTime.getTime()) / 60000)
          : 0,
        startCash: closedShift.startCash,
        endCash: closedShift.endCash,
        totalRevenue,
        totalTips,
        ordersCount,
        cashOrders,
        cardOrders,
        note: closedShift.note,
      },
      newShift: {
        id: newShift.id,
        operator: newShift.operator,
        startTime: newShift.startTime,
        startCash: newShift.startCash,
      },
    };

    return NextResponse.json(summary);
  } catch (e) {
    console.error("POST /api/shifts/handover error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
