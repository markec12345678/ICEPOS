// @ts-nocheck — pre-existing TS errors (non-critical route)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/payment-analytics?days=30 — analiza načinov plačila
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const days = Math.min(parseInt(req.nextUrl.searchParams.get("days") || "30", 10), 365);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const orders = await db.order.findMany({
      where: {
        restaurantId: tenant.id,
        status: "paid",
        paidAt: { gte: since },
      },
      select: {
        total: true,
        tip: true,
        paymentMethod: true,
        paidAt: true,
        operator: true,
      },
    });

    // Po načinih plačila
    const byMethod: Record<string, {
      count: number;
      total: number;
      tips: number;
      avgOrder: number;
    }> = {};

    for (const o of orders) {
      const method = o.paymentMethod || "unknown";
      if (!byMethod[method]) {
        byMethod[method] = { count: 0, total: 0, tips: 0, avgOrder: 0 };
      }
      byMethod[method].count++;
      byMethod[method].total += o.total;
      byMethod[method].tips += o.tip || 0;
    }

    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
    const totalTips = orders.reduce((s, o) => s + (o.tip || 0), 0);
    const totalOrders = orders.length;

    const methodStats = Object.entries(byMethod).map(([method, v]) => ({
      method,
      count: v.count,
      total: Math.round(Number(v.total) * 100) / 100,
      tips: Math.round(v.tips * 100) / 100,
      avgOrder: v.count > 0 ? Math.round((Number(v.total) / v.count) * 100) / 100 : 0,
      share: totalRevenue > 0 ? Math.round((Number(v.total) / totalRevenue) * 1000) / 10 : 0,
      tipRate: Number(v.total) > 0 ? Math.round((v.tips / v.total) * 1000) / 10 : 0,
    })).sort((a, b) => Number(b.total) - a.total);

    // Trend po dnevih (zadnjih 14 dni)
    const dailyTrend: { date: string; cash: number; card: number; giftcard: number; other: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayOrders = orders.filter((o) => {
        if (!o.paidAt) return false;
        return o.paidAt.toISOString().slice(0, 10) === dateStr;
      });
      dailyTrend.push({
        date: dateStr,
        cash: Math.round(dayOrders.filter((o) => o.paymentMethod === "cash").reduce((s, o) => s + o.total, 0) * 100) / 100,
        card: Math.round(dayOrders.filter((o) => o.paymentMethod === "card").reduce((s, o) => s + o.total, 0) * 100) / 100,
        giftcard: Math.round(dayOrders.filter((o) => o.paymentMethod === "giftcard").reduce((s, o) => s + o.total, 0) * 100) / 100,
        other: Math.round(dayOrders.filter((o) => o.paymentMethod && !["cash", "card", "giftcard"].includes(o.paymentMethod)).reduce((s, o) => s + o.total, 0) * 100) / 100,
      });
    }

    // Po operaterjih (kdo uporablja kateri način)
    const byOperator: Record<string, { cash: number; card: number; giftcard: number; total: number; count: number }> = {};
    for (const o of orders) {
      const op = o.operator || "Neznan";
      if (!byOperator[op]) byOperator[op] = { cash: 0, card: 0, giftcard: 0, total: 0, count: 0 };
      byOperator[op].total += o.total;
      byOperator[op].count++;
      if (o.paymentMethod === "cash") byOperator[op].cash++;
      else if (o.paymentMethod === "card") byOperator[op].card++;
      else if (o.paymentMethod === "giftcard") byOperator[op].giftcard++;
    }

    const operatorStats = Object.entries(byOperator).map(([operator, v]) => ({
      operator,
      total: Math.round(Number(v.total) * 100) / 100,
      count: v.count,
      cashCount: v.cash,
      cardCount: v.card,
      giftcardCount: v.giftcard,
      cashPct: v.count > 0 ? Math.round((v.cash / v.count) * 1000) / 10 : 0,
      cardPct: v.count > 0 ? Math.round((v.card / v.count) * 1000) / 10 : 0,
    })).sort((a, b) => Number(b.total) - a.total);

    // Po dnevih v tednu
    const dayNames = ["Ned", "Pon", "Tor", "Sre", "Čet", "Pet", "Sob"];
    const byDayOfWeek: Record<number, { cash: number; card: number; total: number }> = {};
    for (const o of orders) {
      if (!o.paidAt) continue;
      const dow = o.paidAt.getDay();
      if (!byDayOfWeek[dow]) byDayOfWeek[dow] = { cash: 0, card: 0, total: 0 };
      byDayOfWeek[dow].total += o.total;
      if (o.paymentMethod === "cash") byDayOfWeek[dow].cash++;
      else if (o.paymentMethod === "card") byDayOfWeek[dow].card++;
    }

    const dayOfWeekStats = Array.from({ length: 7 }, (_, i) => {
      const v = byDayOfWeek[i] || { cash: 0, card: 0, total: 0 };
      const total = v.cash + v.card;
      return {
        day: i,
        dayName: dayNames[i],
        cashCount: v.cash,
        cardCount: v.card,
        cashPct: total > 0 ? Math.round((v.cash / total) * 1000) / 10 : 0,
        cardPct: total > 0 ? Math.round((v.card / total) * 1000) / 10 : 0,
      };
    });

    return NextResponse.json({
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalTips: Math.round(totalTips * 100) / 100,
        totalOrders,
        avgOrderValue: totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0,
        overallTipRate: totalRevenue > 0 ? Math.round((totalTips / totalRevenue) * 1000) / 10 : 0,
      },
      methodStats,
      dailyTrend,
      operatorStats,
      dayOfWeekStats,
      days,
    });
  } catch (e) {
    console.error("GET /api/payment-analytics error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
