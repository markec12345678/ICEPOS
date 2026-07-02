import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/employee-performance?days=30 — prodajna statistika per operater
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const days = parseInt(req.nextUrl.searchParams.get("days") || "30", 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const orders = await db.order.findMany({
      where: {
        status: "paid",
        restaurantId: tenant.id,
        paidAt: { gte: since },
      },
      select: {
        operator: true,
        total: true,
        tip: true,
        paymentMethod: true,
        paidAt: true,
      },
    });

    // Grupiraj po operaterju
    const perfMap = new Map<string, {
      operator: string;
      orders: number;
      revenue: number;
      tips: number;
      avgOrder: number;
      cashOrders: number;
      cardOrders: number;
      hourly: Record<string, number>;
    }>();

    for (const o of orders) {
      const op = o.operator || "Neznan";
      const existing = perfMap.get(op);
      if (existing) {
        existing.orders++;
        existing.revenue += o.total;
        existing.tips += o.tip || 0;
        if (o.paymentMethod === "cash") existing.cashOrders++;
        if (o.paymentMethod === "card") existing.cardOrders++;
        if (o.paidAt) {
          const h = new Date(o.paidAt).getHours();
          existing.hourly[`${h}:00`] = (existing.hourly[`${h}:00`] || 0) + o.total;
        }
      } else {
        const hourly: Record<string, number> = {};
        if (o.paidAt) {
          const h = new Date(o.paidAt).getHours();
          hourly[`${h}:00`] = o.total;
        }
        perfMap.set(op, {
          operator: op,
          orders: 1,
          revenue: o.total,
          tips: o.tip || 0,
          avgOrder: 0,
          cashOrders: o.paymentMethod === "cash" ? 1 : 0,
          cardOrders: o.paymentMethod === "card" ? 1 : 0,
          hourly,
        });
      }
    }

    const performance = [...perfMap.values()]
      .map((p) => ({
        ...p,
        revenue: Math.round(p.revenue * 100) / 100,
        tips: Math.round(p.tips * 100) / 100,
        avgOrder: p.orders > 0 ? Math.round((p.revenue / p.orders) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Skupno
    const totalRevenue = performance.reduce((s, p) => s + p.revenue, 0);
    const totalOrders = performance.reduce((s, p) => s + p.orders, 0);
    const totalTips = performance.reduce((s, p) => s + p.tips, 0);
    const topPerformer = performance[0]?.operator || "—";

    return NextResponse.json({
      performance,
      summary: {
        totalOperators: performance.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders,
        totalTips: Math.round(totalTips * 100) / 100,
        avgOrder: totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0,
        topPerformer,
      },
      days,
    });
  } catch (e) {
    console.error("GET /api/employee-performance error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
