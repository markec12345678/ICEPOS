import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/operator-leaderboard?days=7 — tedenski ranking operaterjev z achievementi
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
      select: {
        operator: true,
        total: true,
        tip: true,
        paidAt: true,
        items: { select: { quantity: true } },
      },
    });

    // Grupiraj po operaterju
    const operatorMap: Record<string, {
      operator: string;
      orders: number;
      revenue: number;
      tips: number;
      items: number;
      avgOrder: number;
      maxOrder: number;
      tipRate: number;
    }> = {};

    for (const o of orders) {
      const op = o.operator || "Neznan";
      if (!operatorMap[op]) {
        operatorMap[op] = { operator: op, orders: 0, revenue: 0, tips: 0, items: 0, avgOrder: 0, maxOrder: 0, tipRate: 0 };
      }
      operatorMap[op].orders++;
      operatorMap[op].revenue += o.total;
      operatorMap[op].tips += o.tip || 0;
      operatorMap[op].items += o.items.reduce((s, i) => s + i.quantity, 0);
      operatorMap[op].maxOrder = Math.max(operatorMap[op].maxOrder, o.total);
    }

    // Izračunaj povprečja in achievements
    const leaderboard = Object.values(operatorMap)
      .map((op) => {
        op.avgOrder = op.orders > 0 ? op.revenue / op.orders : 0;
        op.tipRate = op.revenue > 0 ? (op.tips / op.revenue) * 100 : 0;

        // Achievements
        const achievements: { id: string; label: string; icon: string; desc: string }[] = [];
        if (op.revenue >= 2000) achievements.push({ id: "revenue2k", label: "€2000+", icon: "💰", desc: "Presegel 2000€ prometa" });
        if (op.revenue >= 1000) achievements.push({ id: "revenue1k", label: "€1000+", icon: "🏆", desc: "Presegel 1000€ prometa" });
        if (op.orders >= 50) achievements.push({ id: "orders50", label: "50+ računov", icon: "📋", desc: "50+ računov" });
        if (op.orders >= 25) achievements.push({ id: "orders25", label: "25+ računov", icon: "📝", desc: "25+ računov" });
        if (op.avgOrder >= 20) achievements.push({ id: "highAvg", label: "Visok povp.", icon: "⭐", desc: "Povprečni račun 20€+" });
        if (op.tipRate >= 10) achievements.push({ id: "tipMaster", label: "Tip master", icon: "🪙", desc: "10%+ tip rate" });
        if (op.tips >= 50) achievements.push({ id: "tips50", label: "50€+ napitnin", icon: "💎", desc: "50€+ napitnin" });
        if (op.items >= 100) achievements.push({ id: "items100", label: "100+ postavk", icon: "🍽️", desc: "100+ postavk prodanih" });

        return {
          ...op,
          revenue: Math.round(op.revenue * 100) / 100,
          tips: Math.round(op.tips * 100) / 100,
          avgOrder: Math.round(op.avgOrder * 100) / 100,
          maxOrder: Math.round(op.maxOrder * 100) / 100,
          tipRate: Math.round(op.tipRate * 10) / 10,
          achievements,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    // Skupne metrike
    const totalRevenue = leaderboard.reduce((s, o) => s + o.revenue, 0);
    const totalOrders = leaderboard.reduce((s, o) => s + o.orders, 0);
    const totalTips = leaderboard.reduce((s, o) => s + o.tips, 0);

    // Top performer
    const topPerformer = leaderboard[0] || null;

    return NextResponse.json({
      leaderboard,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders,
        totalTips: Math.round(totalTips * 100) / 100,
        operatorCount: leaderboard.length,
      },
      topPerformer: topPerformer ? {
        operator: topPerformer.operator,
        revenue: topPerformer.revenue,
        orders: topPerformer.orders,
        achievements: topPerformer.achievements.length,
      } : null,
      days,
    });
  } catch (e) {
    console.error("GET /api/operator-leaderboard error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
