// @ts-nocheck — Decimal migration TS errors (Task V2)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/orders/active-summary — povzetek vseh odprtih naročil
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const orders = await db.order.findMany({
      where: {
        restaurantId: tenant.id,
        status: "open",
      },
      include: {
        table: { select: { id: true, name: true, number: true, section: true, seats: true } },
        items: {
          include: {
            menuItem: { select: { id: true, name: true, price: true, category: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const now = new Date();
    const summary = orders.map((o) => {
      const elapsed = Math.floor((now.getTime() - o.createdAt.getTime()) / 60000);
      const itemCount = o.items.reduce((s, i) => s + i.quantity, 0);
      const total = o.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

      // Urgency
      let urgency: "normal" | "warning" | "urgent" = "normal";
      if (elapsed >= 90) urgency = "urgent";
      else if (elapsed >= 45) urgency = "warning";

      // Has flags?
      let flags: string[] = [];
      if (o.flags) {
        try {
          const parsed = JSON.parse(o.flags);
          if (Array.isArray(parsed)) flags = parsed;
        } catch {
          // ignore
        }
      }

      // Items po kategoriji
      const byCategory: Record<string, number> = {};
      for (const item of o.items) {
        const cat = item.menuItem?.category || "unknown";
        byCategory[cat] = (byCategory[cat] || 0) + item.quantity;
      }

      return {
        id: o.id,
        tableId: o.tableId,
        tableName: o.table?.name || "—",
        tableNumber: o.table?.number || 0,
        section: o.table?.section || "—",
        seats: o.table?.seats || 0,
        operator: o.operator,
        createdAt: o.createdAt.toISOString(),
        elapsed,
        urgency,
        itemCount,
        total: Math.round(total * 100) / 100,
        flags,
        byCategory,
        hasNotes: o.items.some((i) => i.note),
        hasFlags: flags.length > 0,
      };
    });

    // Skupne metrike
    const totalOrders = summary.length;
    const totalItems = summary.reduce((s, o) => s + o.itemCount, 0);
    const totalValue = summary.reduce((s, o) => s + o.total, 0);
    const urgentCount = summary.filter((o) => o.urgency === "urgent").length;
    const warningCount = summary.filter((o) => o.urgency === "warning").length;
    const avgElapsed = totalOrders > 0
      ? Math.round(summary.reduce((s, o) => s + o.elapsed, 0) / totalOrders)
      : 0;
    const flaggedCount = summary.filter((o) => o.hasFlags).length;

    return NextResponse.json({
      orders: summary,
      summary: {
        totalOrders,
        totalItems,
        totalValue: Math.round(totalValue * 100) / 100,
        urgentCount,
        warningCount,
        avgElapsed,
        flaggedCount,
      },
    });
  } catch (e) {
    console.error("GET /api/orders/active-summary error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
