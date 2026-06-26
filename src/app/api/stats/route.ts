import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Statistika za nadzorno ploščo (današnji dan)
export async function GET() {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const paidOrders = await db.order.findMany({
      where: {
        status: "paid",
        paidAt: { gte: startOfDay, lte: endOfDay },
      },
      include: { items: { include: { menuItem: true } } },
    });

    const todayRevenue = paidOrders.reduce((s, o) => s + o.total, 0);
    const todayOrders = paidOrders.length;
    const avgOrderValue = todayOrders > 0 ? todayRevenue / todayOrders : 0;

    const totalTables = await db.table.count();
    const openOrders = await db.order.findMany({
      where: { status: "open" },
      select: { tableId: true },
    });
    const openTables = openOrders.length;

    // Top izdelki
    const itemCounts = new Map<string, { name: string; count: number; revenue: number }>();
    for (const o of paidOrders) {
      for (const it of o.items) {
        const key = it.menuItemId;
        const existing = itemCounts.get(key);
        const lineRev = it.unitPrice * it.quantity;
        if (existing) {
          existing.count += it.quantity;
          existing.revenue += lineRev;
        } else {
          itemCounts.set(key, {
            name: it.menuItem.name,
            count: it.quantity,
            revenue: lineRev,
          });
        }
      }
    }
    const topItems = [...itemCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Urna statistika
    const hourly: { hour: string; revenue: number }[] = [];
    for (let h = 8; h <= 23; h++) {
      const hourOrders = paidOrders.filter(
        (o) => o.paidAt && new Date(o.paidAt).getHours() === h
      );
      hourly.push({
        hour: `${String(h).padStart(2, "0")}:00`,
        revenue: hourOrders.reduce((s, o) => s + o.total, 0),
      });
    }

    // Delitev po načinu plačila
    const paymentMap = new Map<string, { count: number; total: number }>();
    for (const o of paidOrders) {
      const method = o.paymentMethod || "cash";
      const existing = paymentMap.get(method);
      if (existing) {
        existing.count += 1;
        existing.total += o.total;
      } else {
        paymentMap.set(method, { count: 1, total: o.total });
      }
    }
    const paymentSplit = [...paymentMap.entries()].map(([method, v]) => ({
      method,
      ...v,
    }));

    return NextResponse.json({
      todayRevenue,
      todayOrders,
      avgOrderValue,
      openTables,
      totalTables,
      topItems,
      hourly,
      paymentSplit,
    });
  } catch (e) {
    console.error("GET /api/stats error:", e);
    return NextResponse.json(
      { error: "Napaka pri branju statistike" },
      { status: 500 }
    );
  }
}
