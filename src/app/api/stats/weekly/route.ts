import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Tedenska statistika — prihodek po dnevih v tednu (za optimizacijo delavnikov)
export async function GET() {
  try {
    // Zadnjih 28 dni (4 tedni) za povprečje po dnevih
    const now = new Date();
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const paidOrders = await db.order.findMany({
      where: {
        status: "paid",
        paidAt: { gte: fourWeeksAgo, lte: now },
      },
      select: {
        total: true,
        paidAt: true,
        paymentMethod: true,
      },
    });

    // Slovenski dnevi v tednu
    const dayNames = ["Nedelja", "Ponedeljek", "Torek", "Sreda", "Četrtek", "Petek", "Sobota"];
    const dayShort = ["Ned", "Pon", "Tor", "Sre", "Čet", "Pet", "Sob"];

    // Agregiraj po dnevu v tednu (0=nedelja, 6=sobota)
    const dayStats: {
      dayIndex: number;
      dayName: string;
      dayShort: string;
      totalRevenue: number;
      orderCount: number;
      avgRevenue: number;
      avgOrders: number;
      cashRevenue: number;
      cardRevenue: number;
      weeksWithData: Set<string>;
    }[] = Array.from({ length: 7 }, (_, i) => ({
      dayIndex: i,
      dayName: dayNames[i],
      dayShort: dayShort[i],
      totalRevenue: 0,
      orderCount: 0,
      avgRevenue: 0,
      avgOrders: 0,
      cashRevenue: 0,
      cardRevenue: 0,
      weeksWithData: new Set<string>(),
    }));

    for (const o of paidOrders) {
      if (!o.paidAt) continue;
      const day = new Date(o.paidAt).getDay(); // 0=nedelja
      const weekKey = new Date(o.paidAt).toISOString().slice(0, 10); // datum
      // Za štetje unikatnih dni v tednu (za povprečje)
      const dateKey = `${new Date(o.paidAt).getFullYear()}-${new Date(
        o.paidAt
      ).getMonth()}-${day}`;
      dayStats[day].weeksWithData.add(dateKey);
      dayStats[day].totalRevenue += o.total;
      dayStats[day].orderCount += 1;
      if (o.paymentMethod === "cash") {
        dayStats[day].cashRevenue += o.total;
      } else if (o.paymentMethod === "card") {
        dayStats[day].cardRevenue += o.total;
      }
    }

    // Izračunaj povprečja (povprečni prihodek na dan v tednu)
    const result = dayStats.map((d) => {
      const daysCount = d.weeksWithData.size || 1;
      return {
        dayIndex: d.dayIndex,
        dayName: d.dayName,
        dayShort: d.dayShort,
        totalRevenue: Math.round(d.totalRevenue * 100) / 100,
        orderCount: d.orderCount,
        avgRevenue: Math.round((d.totalRevenue / daysCount) * 100) / 100,
        avgOrders: Math.round((d.orderCount / daysCount) * 10) / 10,
        cashRevenue: Math.round(d.cashRevenue * 100) / 100,
        cardRevenue: Math.round(d.cardRevenue * 100) / 100,
        daysCount: d.weeksWithData.size,
      };
    });

    // Sortiraj po dnevu v tednu (ponedeljek prvi)
    const sorted = [
      ...result.slice(1, 7), // pon-sob
      result[0], // nedelja na koncu
    ];

    const bestDay = [...sorted].sort((a, b) => b.avgRevenue - a.avgRevenue)[0];
    const worstDay = [...sorted].sort((a, b) => a.avgRevenue - b.avgRevenue)[0];

    return NextResponse.json({
      period: { from: fourWeeksAgo.toISOString(), to: now.toISOString() },
      days: sorted,
      summary: {
        bestDay: bestDay
          ? { day: bestDay.dayName, avgRevenue: bestDay.avgRevenue }
          : null,
        worstDay: worstDay
          ? { day: worstDay.dayName, avgRevenue: worstDay.avgRevenue }
          : null,
        totalRevenue: sorted.reduce((s, d) => s + d.totalRevenue, 0),
        totalOrders: sorted.reduce((s, d) => s + d.orderCount, 0),
      },
    });
  } catch (e) {
    console.error("GET /api/stats/weekly error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
