import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/table-turnover — analitika obračanja miz
// Podpora za ?from=&to=
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");

    const now = new Date();
    const startDate = from ? new Date(from + "T00:00:00") : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to + "T23:59:59") : now;

    // Vse mize
    const tables = await db.table.findMany({
      where: { restaurantId: tenant.id },
      orderBy: { number: "asc" },
    });

    // Vsi plačani računi v obdobju
    const orders = await db.order.findMany({
      where: {
        restaurantId: tenant.id,
        status: "paid",
        paidAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        tableId: true,
        createdAt: true,
        paidAt: true,
        total: true,
      },
    });

    // Izračunaj turnover za vsako mizo
    const tableStats = tables.map((table) => {
      const tableOrders = orders.filter((o) => o.tableId === table.id);
      const orderCount = tableOrders.length;
      const totalRevenue = tableOrders.reduce((s, o) => s + o.total, 0);

      // Izračunaj povprečen čas zasedenosti (createdAt → paidAt)
      const durations: number[] = [];
      for (const o of tableOrders) {
        if (o.paidAt && o.createdAt) {
          const durationMin = (new Date(o.paidAt).getTime() - new Date(o.createdAt).getTime()) / (1000 * 60);
          if (durationMin > 0 && durationMin < 24 * 60) {
            durations.push(durationMin);
          }
        }
      }

      const avgDuration = durations.length > 0
        ? durations.reduce((s, d) => s + d, 0) / durations.length
        : 0;

      // Turnover rate = št. računov / št. dni v obdobju
      const daysInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const turnoverRate = orderCount / daysInPeriod;

      // Povprečni ček
      const avgCheck = orderCount > 0 ? totalRevenue / orderCount : 0;

      // Revenue na sedež na dan
      const revenuePerSeatPerDay = table.seats > 0 ? (totalRevenue / table.seats) / daysInPeriod : 0;

      return {
        tableId: table.id,
        tableNumber: table.number,
        tableName: table.name,
        seats: table.seats,
        section: table.section,
        orderCount,
        totalRevenue,
        avgCheck,
        avgDurationMin: Math.round(avgDuration),
        turnoverRate: Math.round(turnoverRate * 10) / 10,
        revenuePerSeatPerDay: Math.round(revenuePerSeatPerDay * 100) / 100,
        utilizationScore: Math.min(100, (turnoverRate / 5) * 100), // 5 turnover/day = 100%
      };
    });

    // Sortiraj po turnover rate
    tableStats.sort((a, b) => b.turnoverRate - a.turnoverRate);

    // Agregacija po sekcijah
    const sectionMap = new Map<
      string,
      {
        section: string;
        tableCount: number;
        totalOrders: number;
        totalRevenue: number;
        avgTurnoverRate: number;
        avgDuration: number;
      }
    >();

    for (const stat of tableStats) {
      const existing = sectionMap.get(stat.section);
      if (existing) {
        existing.tableCount++;
        existing.totalOrders += stat.orderCount;
        existing.totalRevenue += stat.totalRevenue;
        existing.avgTurnoverRate += stat.turnoverRate;
        existing.avgDuration += stat.avgDurationMin;
      } else {
        sectionMap.set(stat.section, {
          section: stat.section,
          tableCount: 1,
          totalOrders: stat.orderCount,
          totalRevenue: stat.totalRevenue,
          avgTurnoverRate: stat.turnoverRate,
          avgDuration: stat.avgDurationMin,
        });
      }
    }

    for (const s of sectionMap.values()) {
      s.avgTurnoverRate = s.tableCount > 0 ? s.avgTurnoverRate / s.tableCount : 0;
      s.avgDuration = s.tableCount > 0 ? s.avgDuration / s.tableCount : 0;
    }

    // urni analiza (katere ure so najbolj obremenjene)
    const hourlyMap = new Map<number, number>();
    for (const o of orders) {
      const hour = new Date(o.createdAt).getHours();
      hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
    }

    const hourly = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      orderCount: hourlyMap.get(h) || 0,
    }));

    // Povzetek
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
    const allDurations = tableStats.map((t) => t.avgDurationMin).filter((d) => d > 0);
    const overallAvgDuration = allDurations.length > 0
      ? allDurations.reduce((s, d) => s + d, 0) / allDurations.length
      : 0;
    const daysInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    const summary = {
      totalTables: tables.length,
      totalOrders,
      totalRevenue,
      avgCheck: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      avgTurnoverPerTable: tables.length > 0 ? totalOrders / tables.length : 0,
      avgDurationMin: Math.round(overallAvgDuration),
      avgTurnoverRatePerDay: totalOrders / (tables.length * daysInPeriod),
      peakHour: hourly.reduce((max, h) => (h.orderCount > max.orderCount ? h : max), { hour: 0, orderCount: 0 }).hour,
      bestPerformingTable: tableStats[0]?.tableName || "—",
      worstPerformingTable: tableStats[tableStats.length - 1]?.tableName || "—",
      daysInPeriod,
    };

    return NextResponse.json({
      period: {
        from: startDate.toISOString().slice(0, 10),
        to: endDate.toISOString().slice(0, 10),
      },
      tableStats,
      sectionSummary: Array.from(sectionMap.values()),
      hourly,
      summary,
    });
  } catch (e) {
    console.error("GET /api/table-turnover error:", e);
    return NextResponse.json({ error: "Napaka pri analizi obračanja miz" }, { status: 500 });
  }
}
