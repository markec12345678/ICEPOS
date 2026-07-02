import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/tables/turn-time?days=7 — povprečni turn time miz po dnevih
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const days = Math.min(parseInt(req.nextUrl.searchParams.get("days") || "7", 10), 30);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const orders = await db.order.findMany({
      where: {
        restaurantId: tenant.id,
        status: "paid",
        paidAt: { gte: since },
      },
      include: {
        table: { select: { name: true, number: true, section: true } },
      },
      orderBy: { paidAt: "desc" },
    });

    // Izračunaj turn time za vsak račun (paidAt - createdAt v minutah)
    type TurnRecord = {
      date: string;
      dayName: string;
      tableId: string;
      tableName: string;
      section: string;
      durationMin: number;
      total: number;
      items: number;
    };

    const records: TurnRecord[] = [];
    const dayNames = ["Ned", "Pon", "Tor", "Sre", "Čet", "Pet", "Sob"];

    for (const o of orders) {
      if (!o.paidAt) continue;
      const durationMin = Math.round(
        (o.paidAt.getTime() - o.createdAt.getTime()) / 60000
      );
      if (durationMin < 1 || durationMin > 600) continue; // skip outliers

      const dateStr = o.paidAt.toISOString().slice(0, 10);
      records.push({
        date: dateStr,
        dayName: dayNames[o.paidAt.getDay()],
        tableId: o.tableId,
        tableName: o.table?.name || "Miza",
        section: o.table?.section || "—",
        durationMin,
        total: o.total,
        items: 0, // ne vračamo items za zdaj
      });
    }

    // Agregacija po dnevih
    const byDate: Record<string, { durations: number[]; totals: number[]; count: number; dayName: string }> = {};
    for (const r of records) {
      if (!byDate[r.date]) {
        byDate[r.date] = { durations: [], totals: [], count: 0, dayName: r.dayName };
      }
      byDate[r.date].durations.push(r.durationMin);
      byDate[r.date].totals.push(r.total);
      byDate[r.date].count++;
    }

    const dailyStats = Object.entries(byDate)
      .map(([date, v]) => ({
        date,
        dayName: v.dayName,
        avgTurnTime: Math.round(v.durations.reduce((s, x) => s + x, 0) / v.durations.length),
        minTurnTime: Math.min(...v.durations),
        maxTurnTime: Math.max(...v.durations),
        count: v.count,
        revenue: Math.round(v.totals.reduce((s, x) => s + x, 0) * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Agregacija po sekcijah
    const bySection: Record<string, { durations: number[]; count: number }> = {};
    for (const r of records) {
      if (!bySection[r.section]) {
        bySection[r.section] = { durations: [], count: 0 };
      }
      bySection[r.section].durations.push(r.durationMin);
      bySection[r.section].count++;
    }

    const sectionStats = Object.entries(bySection)
      .map(([section, v]) => ({
        section,
        avgTurnTime: Math.round(v.durations.reduce((s, x) => s + x, 0) / v.durations.length),
        count: v.count,
      }))
      .sort((a, b) => b.count - a.count);

    // Agregacija po dnevu v tednu
    const byDayOfWeek: Record<number, { durations: number[]; count: number }> = {};
    for (const r of records) {
      const dow = new Date(r.date).getDay();
      if (!byDayOfWeek[dow]) byDayOfWeek[dow] = { durations: [], count: 0 };
      byDayOfWeek[dow].durations.push(r.durationMin);
      byDayOfWeek[dow].count++;
    }

    const dayOfWeekStats = Array.from({ length: 7 }, (_, i) => {
      const v = byDayOfWeek[i];
      return {
        dayOfWeek: i,
        dayName: dayNames[i],
        avgTurnTime: v ? Math.round(v.durations.reduce((s, x) => s + x, 0) / v.durations.length) : 0,
        count: v?.count || 0,
      };
    });

    // Skupne metrike
    const allDurations = records.map((r) => r.durationMin);
    const overall = {
      avgTurnTime: allDurations.length > 0 ? Math.round(allDurations.reduce((s, x) => s + x, 0) / allDurations.length) : 0,
      minTurnTime: allDurations.length > 0 ? Math.min(...allDurations) : 0,
      maxTurnTime: allDurations.length > 0 ? Math.max(...allDurations) : 0,
      totalTables: records.length,
      avgRevenuePerTable: records.length > 0 ? Math.round(records.reduce((s, r) => s + r.total, 0) / records.length * 100) / 100 : 0,
      // Turnover rate: koliko miz na dan (uporablja fiksno število miz)
      avgTablesPerDay: dailyStats.length > 0 ? Math.round(records.length / dailyStats.length) : 0,
    };

    return NextResponse.json({
      daily: dailyStats,
      bySection: sectionStats,
      byDayOfWeek: dayOfWeekStats,
      overall,
      days,
    });
  } catch (e) {
    console.error("GET /api/tables/turn-time error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
