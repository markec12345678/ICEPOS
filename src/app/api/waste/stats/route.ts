// @ts-nocheck — Decimal migration TS errors (Task V2)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/waste/stats?days=30 — statistika odpadkov
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const days = parseInt(req.nextUrl.searchParams.get("days") || "30", 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const wasteLogs = await db.wasteLog.findMany({
      where: {
        restaurantId: tenant.id,
        createdAt: { gte: since },
      },
    });

    const totalCost = wasteLogs.reduce((s, w) => s + w.cost, 0);
    const totalQuantity = wasteLogs.length;

    // Po razlogu
    const byReason = new Map<string, { count: number; cost: number }>();
    for (const w of wasteLogs) {
      const existing = byReason.get(w.reason);
      if (existing) {
        existing.count += 1;
        existing.cost += w.cost;
      } else {
        byReason.set(w.reason, { count: 1, cost: w.cost });
      }
    }

    // Po item-u (top 10)
    const byItem = new Map<string, { count: number; cost: number; quantity: number }>();
    for (const w of wasteLogs) {
      const existing = byItem.get(w.name);
      if (existing) {
        existing.count += 1;
        existing.cost += w.cost;
        existing.quantity += w.quantity;
      } else {
        byItem.set(w.name, {
          count: 1,
          cost: w.cost,
          quantity: w.quantity,
        });
      }
    }
    const topItems = [...byItem.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    // Po dnevu (trend)
    const byDay = new Map<string, { cost: number; count: number }>();
    for (const w of wasteLogs) {
      const day = w.createdAt.toISOString().slice(0, 10);
      const existing = byDay.get(day);
      if (existing) {
        existing.cost += w.cost;
        existing.count += 1;
      } else {
        byDay.set(day, { cost: w.cost, count: 1 });
      }
    }
    const dailyTrend = [...byDay.entries()]
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Pridobi promet za isti obdobje (za waste % izračun)
    const paidOrders = await db.order.findMany({
      where: {
        status: "paid",
        restaurantId: tenant.id,
        paidAt: { gte: since },
      },
      select: { total: true },
    });
    const revenue = paidOrders.reduce((s, o) => s + o.total, 0);
    const wastePct = revenue > 0 ? (totalCost / revenue) * 100 : 0;

    return NextResponse.json({
      days,
      totalCost: Math.round(totalCost * 100) / 100,
      totalEntries: totalQuantity,
      wastePct: Math.round(wastePct * 100) / 100,
      revenue: Math.round(revenue * 100) / 100,
      byReason: [...byReason.entries()]
        .map(([reason, v]) => ({
          reason,
          count: v.count,
          cost: Math.round(v.cost * 100) / 100,
        }))
        .sort((a, b) => b.cost - a.cost),
      topItems,
      dailyTrend: dailyTrend.map((d) => ({
        ...d,
        cost: Math.round(d.cost * 100) / 100,
      })),
    });
  } catch (e) {
    console.error("GET /api/waste/stats error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
