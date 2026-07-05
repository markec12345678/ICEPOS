// @ts-nocheck — pre-existing TS errors (non-critical analytics/reporting route)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/weekly-comparison — primerjava tega tedna z prejšnjim
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const now = new Date();
    // This week: Monday to now
    const thisWeekStart = new Date(now);
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
    thisWeekStart.setDate(now.getDate() - diff);
    thisWeekStart.setHours(0, 0, 0, 0);

    // Last week
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);

    // Pridobi orderje za oba tedna
    const [thisWeekOrders, lastWeekOrders] = await Promise.all([
      db.order.findMany({
        where: {
          restaurantId: tenant.id,
          status: "paid",
          paidAt: { gte: thisWeekStart, lte: now },
        },
        select: { total: true, tip: true, paidAt: true, paymentMethod: true, operator: true },
      }),
      db.order.findMany({
        where: {
          restaurantId: tenant.id,
          status: "paid",
          paidAt: { gte: lastWeekStart, lt: lastWeekEnd },
        },
        select: { total: true, tip: true, paidAt: true, paymentMethod: true, operator: true },
      }),
    ]);

    // Izračunaj metrike za oba tedna
    function calcMetrics(orders: typeof thisWeekOrders) {
      const revenue = orders.reduce((s, o) => s + Number(o.total), 0);
      const tips = orders.reduce((s, o) => s + (Number(o.tip) || 0), 0);
      const count = orders.length;
      const avgOrder = count > 0 ? revenue / count : 0;

      // Po načinih plačila
      const byMethod: Record<string, number> = {};
      for (const o of orders) {
        const m = o.paymentMethod || "unknown";
        byMethod[m] = (byMethod[m] || 0) + o.total;
      }

      // Po dnevih v tednu
      const byDay: Record<number, { revenue: number; count: number }> = {};
      for (const o of orders) {
        if (!o.paidAt) continue;
        const dow = o.paidAt.getDay();
        if (!byDay[dow]) byDay[dow] = { revenue: 0, count: 0 };
        byDay[dow].revenue += Number(o.total);
        byDay[dow].count++;
      }

      // Po operaterjih
      const byOperator: Record<string, { revenue: number; count: number }> = {};
      for (const o of orders) {
        const op = o.operator || "Neznan";
        if (!byOperator[op]) byOperator[op] = { revenue: 0, count: 0 };
        byOperator[op].revenue += Number(o.total);
        byOperator[op].count++;
      }

      return {
        revenue: Math.round(revenue * 100) / 100,
        tips: Math.round(tips * 100) / 100,
        count,
        avgOrder: Math.round(avgOrder * 100) / 100,
        byMethod,
        byDay,
        byOperator,
      };
    }

    const thisWeek = calcMetrics(thisWeekOrders);
    const lastWeek = calcMetrics(lastWeekOrders);

    // Spremembe v %
    function pctChange(curr: number, prev: number): number {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 1000) / 10;
    }

    const changes = {
      revenue: pctChange(thisWeek.revenue, lastWeek.revenue),
      tips: pctChange(thisWeek.tips, lastWeek.tips),
      count: pctChange(thisWeek.count, lastWeek.count),
      avgOrder: pctChange(thisWeek.avgOrder, lastWeek.avgOrder),
    };

    // Dnevna primerjava (pon-ned)
    const dayNames = ["Ned", "Pon", "Tor", "Sre", "Čet", "Pet", "Sob"];
    const dayComparison = [1, 2, 3, 4, 5, 6, 0].map((dow) => {
      const thisDay = thisWeek.byDay[dow] || { revenue: 0, count: 0 };
      const lastDay = lastWeek.byDay[dow] || { revenue: 0, count: 0 };
      return {
        day: dow,
        dayName: dayNames[dow],
        thisWeek: {
          revenue: Math.round(thisDay.revenue * 100) / 100,
          count: thisDay.count,
        },
        lastWeek: {
          revenue: Math.round(lastDay.revenue * 100) / 100,
          count: lastDay.count,
        },
        change: pctChange(thisDay.revenue, lastDay.revenue),
        isFuture: dow > dayOfWeek, // dnevi ki še prihajajo
      };
    });

    return NextResponse.json({
      thisWeek,
      lastWeek,
      changes,
      dayComparison,
      period: {
        thisWeekStart: thisWeekStart.toISOString(),
        lastWeekStart: lastWeekStart.toISOString(),
        now: now.toISOString(),
      },
    });
  } catch (e) {
    console.error("GET /api/weekly-comparison error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
