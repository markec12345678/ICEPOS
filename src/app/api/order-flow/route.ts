import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/order-flow — vizualni tok naročil skozi faze
// Faze: new → preparing → ready → served → paid
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Vsi računi danes (open + paid)
    const orders = await db.order.findMany({
      where: {
        restaurantId: tenant.id,
        createdAt: { gte: todayStart },
        status: { in: ["open", "paid"] },
      },
      include: {
        table: { select: { name: true, number: true } },
        items: { select: { id: true, quantity: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Faze
    const stages = {
      open: orders.filter((o) => o.status === "open"),
      paid: orders.filter((o) => o.status === "paid" && !o.stornoOf),
      storno: orders.filter((o) => o.stornoOf),
    };

    // Izračunaj povprečne čase med fazami
    const paidOrders = stages.paid;
    let avgOrderToPay = 0;
    let minTime = 999;
    let maxTime = 0;
    const times: number[] = [];

    for (const o of paidOrders) {
      if (o.paidAt) {
        const duration = (o.paidAt.getTime() - o.createdAt.getTime()) / 60000;
        if (duration > 0 && duration < 600) {
          times.push(duration);
          avgOrderToPay += duration;
          minTime = Math.min(minTime, duration);
          maxTime = Math.max(maxTime, duration);
        }
      }
    }

    avgOrderToPay = times.length > 0 ? avgOrderToPay / times.length : 0;

    // Percentili
    times.sort((a, b) => a - b);
    const p50 = times.length > 0 ? times[Math.floor(times.length * 0.5)] : 0;
    const p90 = times.length > 0 ? times[Math.floor(times.length * 0.9)] : 0;

    // Urna statistika (danes)
    const hourly: { hour: number; open: number; paid: number; revenue: number }[] = [];
    for (let h = 0; h < 24; h++) {
      const hourOpen = orders.filter((o) => o.createdAt.getHours() === h).length;
      const hourPaid = paidOrders.filter((o) => o.paidAt && o.paidAt.getHours() === h).length;
      const hourRevenue = paidOrders
        .filter((o) => o.paidAt && o.paidAt.getHours() === h)
        .reduce((s, o) => s + o.total, 0);
      if (hourOpen > 0 || hourPaid > 0 || hourRevenue > 0) {
        hourly.push({
          hour: h,
          open: hourOpen,
          paid: hourPaid,
          revenue: Math.round(hourRevenue * 100) / 100,
        });
      }
    }

    // Pipeline števci
    const pipeline = {
      open: {
        count: stages.open.length,
        items: stages.open.reduce((s, o) => s + o.items.reduce((si, i) => si + i.quantity, 0), 0),
        value: Math.round(stages.open.reduce((s, o) => s + o.items.reduce((si, i) => si + i.quantity, 0), 0) * 0),
        avgAge: stages.open.length > 0
          ? Math.round(stages.open.reduce((s, o) => s + (now.getTime() - o.createdAt.getTime()) / 60000, 0) / stages.open.length)
          : 0,
      },
      paid: {
        count: stages.paid.length,
        items: stages.paid.reduce((s, o) => s + o.items.reduce((si, i) => si + i.quantity, 0), 0),
        value: Math.round(stages.paid.reduce((s, o) => s + o.total, 0) * 100) / 100,
        avgTime: Math.round(avgOrderToPay),
      },
      storno: {
        count: stages.storno.length,
        value: Math.round(stages.storno.reduce((s, o) => s + Math.abs(o.total), 0) * 100) / 100,
      },
    };

    // Conversion rate
    const totalOrders = orders.length;
    const conversionRate = totalOrders > 0 ? Math.round((stages.paid.length / totalOrders) * 1000) / 10 : 0;

    // Active orders z detaili
    const activeOrders = stages.open
      .map((o) => ({
        id: o.id,
        tableName: o.table?.name || "—",
        tableNumber: o.table?.number || 0,
        createdAt: o.createdAt.toISOString(),
        ageMinutes: Math.round((now.getTime() - o.createdAt.getTime()) / 60000),
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
        operator: o.operator,
        flags: o.flags,
      }))
      .sort((a, b) => b.ageMinutes - a.ageMinutes);

    return NextResponse.json({
      pipeline,
      timing: {
        avgOrderToPay: Math.round(avgOrderToPay),
        minTime: minTime === 999 ? 0 : Math.round(minTime),
        maxTime: Math.round(maxTime),
        p50: Math.round(p50),
        p90: Math.round(p90),
        sampleSize: times.length,
      },
      hourly,
      conversionRate,
      totalOrders,
      activeOrders: activeOrders.slice(0, 10),
    });
  } catch (e) {
    console.error("GET /api/order-flow error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
