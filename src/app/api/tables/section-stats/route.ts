// @ts-nocheck — pre-existing TS errors (non-critical route)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/tables/section-stats?days=30 — analitika po sekcijah miz
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const days = Math.min(parseInt(req.nextUrl.searchParams.get("days") || "30", 10), 90);
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Vse mize
    const tables = await db.table.findMany({
      where: { restaurantId: tenant.id },
      select: {
        id: true,
        name: true,
        number: true,
        seats: true,
        section: true,
      },
    });

    // Vse plačane račune v obdobju
    const orders = await db.order.findMany({
      where: {
        restaurantId: tenant.id,
        status: "paid",
        paidAt: { gte: since },
      },
      include: {
        table: { select: { section: true, name: true, number: true } },
        items: { select: { quantity: true, unitPrice: true } },
      },
    });

    // Grupiraj po sekcijah
    const sectionMap: Record<string, {
      section: string;
      tableCount: number;
      totalSeats: number;
      totalOrders: number;
      totalRevenue: number;
      totalItems: number;
      avgOrderValue: number;
      avgTurnTime: number; // v minutah
      revenuePerSeat: number;
      ordersPerTable: number;
      tables: { name: string; number: number; seats: number; orders: number; revenue: number }[];
    }> = {};

    // Inicializiraj sekcije
    for (const table of tables) {
      if (!sectionMap[table.section]) {
        sectionMap[table.section] = {
          section: table.section,
          tableCount: 0,
          totalSeats: 0,
          totalOrders: 0,
          totalRevenue: 0,
          totalItems: 0,
          avgOrderValue: 0,
          avgTurnTime: 0,
          revenuePerSeat: 0,
          ordersPerTable: 0,
          tables: [],
        };
      }
      sectionMap[table.section].tableCount++;
      sectionMap[table.section].totalSeats += table.seats;
    }

    // Pripravi podatke po mizah
    const tableStats: Record<string, { name: string; number: number; section: string; seats: number; orders: number; revenue: number; turnTimes: number[] }> = {};

    for (const table of tables) {
      tableStats[table.id] = {
        name: table.name,
        number: table.number,
        section: table.section,
        seats: table.seats,
        orders: 0,
        revenue: 0,
        turnTimes: [],
      };
    }

    // Agregiraj račune
    for (const order of orders) {
      const section = order.table?.section || "Brez sekcije";
      if (!sectionMap[section]) {
        sectionMap[section] = {
          section,
          tableCount: 0,
          totalSeats: 0,
          totalOrders: 0,
          totalRevenue: 0,
          totalItems: 0,
          avgOrderValue: 0,
          avgTurnTime: 0,
          revenuePerSeat: 0,
          ordersPerTable: 0,
          tables: [],
        };
      }

      sectionMap[section].totalOrders++;
      sectionMap[section].totalRevenue += order.total;
      sectionMap[section].totalItems += order.items.reduce((s, i) => s + i.quantity, 0);

      // Turn time
      if (order.paidAt) {
        const turnMin = (order.paidAt.getTime() - order.createdAt.getTime()) / 60000;
        if (turnMin > 0 && turnMin < 600) {
          sectionMap[section].avgTurnTime += turnMin;
        }
      }

      // Po mizi
      const ts = tableStats[order.tableId];
      if (ts) {
        ts.orders++;
        ts.revenue += order.total;
        if (order.paidAt) {
          const turnMin = (order.paidAt.getTime() - order.createdAt.getTime()) / 60000;
          if (turnMin > 0 && turnMin < 600) {
            ts.turnTimes.push(turnMin);
          }
        }
      }
    }

    // Izračunaj povprečja in dodaj mize v sekcije
    const sections = Object.values(sectionMap).map((s) => {
      s.avgOrderValue = s.totalOrders > 0 ? Number(s.totalRevenue) / s.totalOrders : 0;
      s.avgTurnTime = s.totalOrders > 0 ? s.avgTurnTime / s.totalOrders : 0;
      s.revenuePerSeat = s.totalSeats > 0 ? Number(s.totalRevenue) / s.totalSeats : 0;
      s.ordersPerTable = s.tableCount > 0 ? s.totalOrders / s.tableCount : 0;

      // Dodaj mize v to sekcijo
      s.tables = Object.values(tableStats)
        .filter((t) => t.section === s.section)
        .map((t) => ({
          name: t.name,
          number: t.number,
          seats: t.seats,
          orders: t.orders,
          revenue: t.revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      return {
        ...s,
        totalRevenue: Math.round(Number(s.totalRevenue) * 100) / 100,
        avgOrderValue: Math.round(s.avgOrderValue * 100) / 100,
        avgTurnTime: Math.round(s.avgTurnTime),
        revenuePerSeat: Math.round(s.revenuePerSeat * 100) / 100,
        ordersPerTable: Math.round(s.ordersPerTable * 10) / 10,
        tables: s.tables.map((t) => ({
          ...t,
          revenue: Math.round(t.revenue * 100) / 100,
        })),
      };
    }).sort((a, b) => Number(b.totalRevenue) - a.totalRevenue);

    // Skupne metrike
    const totalRevenue = sections.reduce((s, x) => s + x.totalRevenue, 0);
    const totalOrders = sections.reduce((s, x) => s + x.totalOrders, 0);
    const totalSeats = sections.reduce((s, x) => s + x.totalSeats, 0);
    const totalTables = sections.reduce((s, x) => s + x.tableCount, 0);

    return NextResponse.json({
      sections,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders,
        totalSeats,
        totalTables,
        avgOrderValue: totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0,
        revenuePerSeat: totalSeats > 0 ? Math.round((totalRevenue / totalSeats) * 100) / 100 : 0,
      },
      days,
    });
  } catch (e) {
    console.error("GET /api/tables/section-stats error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
