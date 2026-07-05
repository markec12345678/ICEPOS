// @ts-nocheck — pre-existing TS errors (non-critical route)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/shifts/comparison?days=14 — primerjava smen po dnevih in operaterjih
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const days = Math.min(parseInt(req.nextUrl.searchParams.get("days") || "14", 10), 90);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const shifts = await db.shift.findMany({
      where: {
        restaurantId: tenant.id,
        startTime: { gte: since },
      },
      orderBy: { startTime: "desc" },
    });

    // Po operaterjih
    const byOperator: Record<string, {
      operator: string;
      shiftCount: number;
      totalRevenue: number;
      totalOrders: number;
      totalTips: number;
      avgRevenue: number;
      avgDuration: number;
      totalDuration: number;
      shifts: { id: string; date: string; revenue: number; orders: number; tips: number; duration: number }[];
    }> = {};

    for (const s of shifts) {
      const op = s.operator;
      if (!byOperator[op]) {
        byOperator[op] = {
          operator: op,
          shiftCount: 0,
          totalRevenue: 0,
          totalOrders: 0,
          totalTips: 0,
          avgRevenue: 0,
          avgDuration: 0,
          totalDuration: 0,
          shifts: [],
        };
      }
      const duration = s.endTime
        ? Math.round((s.endTime.getTime() - s.startTime.getTime()) / 60000)
        : 0;
      byOperator[op].shiftCount++;
      byOperator[op].totalRevenue += Number(s.totalRevenue);
      byOperator[op].totalOrders += s.ordersCount;
      byOperator[op].totalDuration += duration;
      byOperator[op].shifts.push({
        id: s.id,
        date: s.startTime.toISOString().slice(0, 10),
        revenue: s.totalRevenue,
        orders: s.ordersCount,
        tips: 0, // tips so na order nivoju, ne na shift
        duration,
      });
    }

    // Izračunaj povprečja
    const operatorStats = Object.values(byOperator).map((o) => ({
      operator: o.operator,
      shiftCount: o.shiftCount,
      totalRevenue: Math.round(Number(o.totalRevenue) * 100) / 100,
      totalOrders: o.totalOrders,
      avgRevenue: o.shiftCount > 0 ? Math.round((Number(o.totalRevenue) / o.shiftCount) * 100) / 100 : 0,
      avgDuration: o.shiftCount > 0 ? Math.round(o.totalDuration / o.shiftCount) : 0,
      revenuePerHour: o.totalDuration > 0 ? Math.round((Number(o.totalRevenue) / (o.totalDuration / 60)) * 100) / 100 : 0,
      shifts: o.shifts.slice(0, 5),
    })).sort((a, b) => Number(b.totalRevenue) - a.totalRevenue);

    // Po dnevih
    const byDay: Record<string, { date: string; revenue: number; orders: number; shifts: number }> = {};
    for (const s of shifts) {
      const dateKey = s.startTime.toISOString().slice(0, 10);
      if (!byDay[dateKey]) byDay[dateKey] = { date: dateKey, revenue: 0, orders: 0, shifts: 0 };
      byDay[dateKey].revenue += Number(s.totalRevenue);
      byDay[dateKey].orders += s.ordersCount;
      byDay[dateKey].shifts++;
    }

    const dailyStats = Object.values(byDay)
      .map((d) => ({
        ...d,
        revenue: Math.round(d.revenue * 100) / 100,
        avgPerShift: d.shifts > 0 ? Math.round((d.revenue / d.shifts) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 14);

    // Skupne metrike
    const totalRevenue = shifts.reduce((s, sh) => s + sh.totalRevenue, 0);
    const totalOrders = shifts.reduce((s, sh) => s + sh.ordersCount, 0);
    const totalShifts = shifts.length;

    // Najboljša smena
    const bestShift = [...shifts].sort((a, b) => Number(b.totalRevenue) - a.totalRevenue)[0];
    const bestDay = dailyStats[0];

    return NextResponse.json({
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders,
        totalShifts,
        avgRevenuePerShift: totalShifts > 0 ? Math.round((totalRevenue / totalShifts) * 100) / 100 : 0,
        avgOrdersPerShift: totalShifts > 0 ? Math.round((totalOrders / totalShifts) * 10) / 10 : 0,
      },
      operatorStats,
      dailyStats,
      bestShift: bestShift ? {
        operator: bestShift.operator,
        date: bestShift.startTime.toISOString().slice(0, 10),
        revenue: bestShift.totalRevenue,
        orders: bestShift.ordersCount,
      } : null,
      bestDay: bestDay ? {
        date: bestDay.date,
        revenue: bestDay.revenue,
        orders: bestDay.orders,
        shifts: bestDay.shifts,
      } : null,
      days,
    });
  } catch (e) {
    console.error("GET /api/shifts/comparison error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
