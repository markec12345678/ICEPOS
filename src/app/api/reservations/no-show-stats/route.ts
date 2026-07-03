import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/reservations/no-show-stats?days=90 — statistika neprispelih rezervacij
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const days = Math.min(parseInt(req.nextUrl.searchParams.get("days") || "90", 10), 365);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const reservations = await db.reservation.findMany({
      where: {
        restaurantId: tenant.id,
        createdAt: { gte: since },
      },
      include: {
        table: { select: { name: true, section: true } },
      },
      orderBy: { date: "desc" },
    });

    // Statistika
    const total = reservations.length;
    const confirmed = reservations.filter((r) => r.status === "confirmed").length;
    const seated = reservations.filter((r) => r.status === "seated").length;
    const cancelled = reservations.filter((r) => r.status === "cancelled").length;
    const noShows = reservations.filter((r) => r.status === "no_show").length;

    const noShowRate = total > 0 ? (noShows / total) * 100 : 0;
    const cancelRate = total > 0 ? (cancelled / total) * 100 : 0;

    // Po strankah (repeat no-shows)
    const customerStats: Record<string, { name: string; phone: string | null; total: number; noShows: number; cancellations: number }> = {};
    for (const r of reservations) {
      const key = r.customerPhone || r.customerName;
      if (!customerStats[key]) {
        customerStats[key] = { name: r.customerName, phone: r.customerPhone, total: 0, noShows: 0, cancellations: 0 };
      }
      customerStats[key].total++;
      if (r.status === "no_show") customerStats[key].noShows++;
      if (r.status === "cancelled") customerStats[key].cancellations++;
    }

    const repeatOffenders = Object.values(customerStats)
      .filter((c) => c.noShows >= 2)
      .sort((a, b) => b.noShows - a.noShows);

    // Po dnevih v tednu
    const dayOfWeekStats: Record<number, { total: number; noShows: number }> = {};
    for (const r of reservations) {
      const dow = new Date(r.date).getDay();
      if (!dayOfWeekStats[dow]) dayOfWeekStats[dow] = { total: 0, noShows: 0 };
      dayOfWeekStats[dow].total++;
      if (r.status === "no_show") dayOfWeekStats[dow].noShows++;
    }

    const dayNames = ["Nedelja", "Ponedeljek", "Torek", "Sreda", "Četrtek", "Petek", "Sobota"];
    const byDayOfWeek = Array.from({ length: 7 }, (_, i) => {
      const stats = dayOfWeekStats[i] || { total: 0, noShows: 0 };
      return {
        day: i,
        dayName: dayNames[i],
        total: stats.total,
        noShows: stats.noShows,
        noShowRate: stats.total > 0 ? Math.round((stats.noShows / stats.total) * 1000) / 10 : 0,
      };
    });

    // No-show vrednost (ocenjena izguba — povprečni račun × št. oseb)
    const avgOrderValue = 25; // ocena
    const totalLostValue = noShows * avgOrderValue * 2; // povprečno 2 osebi

    // Recent no-shows (zadnjih 10)
    const recentNoShows = reservations
      .filter((r) => r.status === "no_show")
      .slice(0, 10)
      .map((r) => ({
        id: r.id,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        partySize: r.partySize,
        date: r.date,
        time: r.time,
        tableName: r.table?.name,
        note: r.note,
      }));

    return NextResponse.json({
      summary: {
        total,
        confirmed,
        seated,
        cancelled,
        noShows,
        noShowRate: Math.round(noShowRate * 10) / 10,
        cancelRate: Math.round(cancelRate * 10) / 10,
        totalLostValue: Math.round(totalLostValue * 100) / 100,
      },
      repeatOffenders,
      byDayOfWeek,
      recentNoShows,
      days,
    });
  } catch (e) {
    console.error("GET /api/reservations/no-show-stats error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
