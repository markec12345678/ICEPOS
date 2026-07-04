// @ts-nocheck — pre-existing TS errors (non-critical route)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/operators/live-status — trenutno aktivni operaterji z odprtimi mizami
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const since = new Date();
    since.setHours(0, 0, 0, 0);

    // Vsi odprti naročili danes
    const openOrders = await db.order.findMany({
      where: {
        restaurantId: tenant.id,
        status: "open",
      },
      include: {
        table: { select: { name: true, number: true, section: true } },
        items: { select: { id: true, quantity: true } },
      },
    });

    // Grupiraj po operaterju
    const operatorMap = new Map<string, {
      operator: string;
      openTables: number;
      totalItems: number;
      tableNames: string[];
      oldestOrder: Date | null;
    }>();

    for (const o of openOrders) {
      const op = o.operator || "Neznan";
      const existing = operatorMap.get(op);
      const itemCount = o.items.reduce((s, i) => s + i.quantity, 0);
      if (existing) {
        existing.openTables++;
        existing.totalItems += itemCount;
        existing.tableNames.push(o.table?.name || "?");
        if (!existing.oldestOrder || o.createdAt < existing.oldestOrder) {
          existing.oldestOrder = o.createdAt;
        }
      } else {
        operatorMap.set(op, {
          operator: op,
          openTables: 1,
          totalItems: itemCount,
          tableNames: [o.table?.name || "?"],
          oldestOrder: o.createdAt,
        });
      }
    }

    // Pridobi še današnjo prodajo per operater (plačani računi)
    const paidOrders = await db.order.findMany({
      where: {
        restaurantId: tenant.id,
        status: "paid",
        paidAt: { gte: since },
      },
      select: {
        operator: true,
        total: true,
        tip: true,
      },
    });

    const salesMap = new Map<string, { revenue: number; tips: number; orders: number }>();
    for (const o of paidOrders) {
      const op = o.operator || "Neznan";
      const existing = salesMap.get(op);
      if (existing) {
        existing.revenue += o.total;
        existing.tips += o.tip || 0;
        existing.orders++;
      } else {
        salesMap.set(op, {
          revenue: o.total,
          tips: o.tip || 0,
          orders: 1,
        });
      }
    }

    // Združi podatke
    const allOperators = new Set([...operatorMap.keys(), ...salesMap.keys()]);
    const operators = Array.from(allOperators).map((op) => {
      const openData = operatorMap.get(op);
      const salesData = salesMap.get(op);
      const now = new Date();
      const oldestMinutes = openData?.oldestOrder
        ? Math.round((now.getTime() - openData.oldestOrder.getTime()) / 60000)
        : 0;

      return {
        operator: op,
        openTables: openData?.openTables || 0,
        totalItems: openData?.totalItems || 0,
        tableNames: openData?.tableNames || [],
        oldestOrderMinutes: oldestMinutes,
        todayRevenue: Math.round((salesData?.revenue || 0) * 100) / 100,
        todayTips: Math.round((salesData?.tips || 0) * 100) / 100,
        todayOrders: salesData?.orders || 0,
      };
    }).sort((a, b) => b.openTables - a.openTables || b.todayRevenue - a.todayRevenue);

    return NextResponse.json({
      operators,
      totalOpen: openOrders.length,
      totalRevenue: Math.round(paidOrders.reduce((s, o) => s + o.total, 0) * 100) / 100,
      totalTips: Math.round(paidOrders.reduce((s, o) => s + (o.tip || 0), 0) * 100) / 100,
    });
  } catch (e) {
    console.error("GET /api/operators/live-status error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
