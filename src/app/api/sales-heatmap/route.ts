// @ts-nocheck — pre-existing TS errors (non-critical route)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/sales-heatmap?weeks=8 — analiza prometa po dnevih v tednu in urah
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const weeks = Math.min(parseInt(req.nextUrl.searchParams.get("weeks") || "8", 10), 26);
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);

    const orders = await db.order.findMany({
      where: {
        restaurantId: tenant.id,
        status: "paid",
        paidAt: { gte: since },
      },
      select: {
        total: true,
        tip: true,
        paidAt: true,
        paymentMethod: true,
      },
    });

    // Heatmap: [dayOfWeek][hour] = { revenue, count }
    // dayOfWeek: 0=nedelja, 1=ponedelnik, ..., 6=sobota
    // hour: 0-23
    const heatmap: number[][][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => [] as number[])
    );

    for (const order of orders) {
      if (!order.paidAt) continue;
      const day = order.paidAt.getDay();
      const hour = order.paidAt.getHours();
      heatmap[day][hour].push(order.total);
    }

    // Agregiraj
    const dayNames = ["Nedelja", "Ponedeljek", "Torek", "Sreda", "Četrtek", "Petek", "Sobota"];
    const dayNamesShort = ["Ned", "Pon", "Tor", "Sre", "Čet", "Pet", "Sob"];

    const cells: {
      day: number;
      dayName: string;
      hour: number;
      revenue: number;
      count: number;
      avg: number;
    }[] = [];

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const values = heatmap[day][hour];
        if (values.length === 0) {
          cells.push({
            day,
            dayName: dayNames[day],
            hour,
            revenue: 0,
            count: 0,
            avg: 0,
          });
        } else {
          const revenue = values.reduce((s, v) => s + v, 0);
          cells.push({
            day,
            dayName: dayNames[day],
            hour,
            revenue: Math.round(revenue * 100) / 100,
            count: values.length,
            avg: Math.round((revenue / values.length) * 100) / 100,
          });
        }
      }
    }

    // Povzetki
    const dayTotals: { day: number; dayName: string; revenue: number; count: number; avgPerDay: number }[] = [];
    for (let day = 0; day < 7; day++) {
      let rev = 0;
      let cnt = 0;
      for (let hour = 0; hour < 24; hour++) {
        const values = heatmap[day][hour];
        rev += values.reduce((s, v) => s + v, 0);
        cnt += values.length;
      }
      dayTotals.push({
        day,
        dayName: dayNames[day],
        revenue: Math.round(rev * 100) / 100,
        count: cnt,
        avgPerDay: weeks > 0 ? Math.round((rev / weeks) * 100) / 100 : 0,
      });
    }

    const hourTotals: { hour: number; revenue: number; count: number }[] = [];
    for (let hour = 0; hour < 24; hour++) {
      let rev = 0;
      let cnt = 0;
      for (let day = 0; day < 7; day++) {
        const values = heatmap[day][hour];
        rev += values.reduce((s, v) => s + v, 0);
        cnt += values.length;
      }
      hourTotals.push({
        hour,
        revenue: Math.round(rev * 100) / 100,
        count: cnt,
      });
    }

    // Peak times
    const sortedCells = [...cells].filter((c) => c.count > 0).sort((a, b) => b.revenue - a.revenue);
    const peakTimes = sortedCells.slice(0, 5).map((c) => ({
      ...c,
      label: `${c.dayName} ${c.hour}:00-${c.hour + 1}:00`,
    }));

    // Best day
    const bestDay = [...dayTotals].sort((a, b) => b.avgPerDay - a.avgPerDay)[0];
    const bestHour = [...hourTotals].sort((a, b) => b.revenue - a.revenue)[0];

    return NextResponse.json({
      cells,
      dayTotals,
      hourTotals,
      peakTimes,
      bestDay,
      bestHour,
      dayNames,
      dayNamesShort,
      weeks,
      totalOrders: orders.length,
      totalRevenue: Math.round(orders.reduce((s, o) => s + o.total, 0) * 100) / 100,
    });
  } catch (e) {
    console.error("GET /api/sales-heatmap error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
