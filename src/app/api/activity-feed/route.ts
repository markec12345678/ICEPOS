import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/activity-feed?limit=20 — zadnje aktivnosti v restavraciji
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20", 10), 50);
    const since = new Date();
    since.setHours(0, 0, 0, 0); // začetek dneva

    // Vzporedno pridobi: plačane račune, nova naročila, rezervacije
    const [paidOrders, openOrders, reservations] = await Promise.all([
      db.order.findMany({
        where: {
          restaurantId: tenant.id,
          status: "paid",
          paidAt: { gte: since },
        },
        include: {
          table: { select: { name: true, number: true } },
          items: { select: { id: true } },
        },
        orderBy: { paidAt: "desc" },
        take: limit,
      }),
      db.order.findMany({
        where: {
          restaurantId: tenant.id,
          status: "open",
          createdAt: { gte: since },
        },
        include: {
          table: { select: { name: true, number: true } },
          items: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      db.reservation.findMany({
        where: {
          restaurantId: tenant.id,
          createdAt: { gte: since },
        },
        include: {
          table: { select: { name: true, number: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);

    type Activity = {
      id: string;
      type: "paid" | "order" | "reservation" | "tip";
      timestamp: string;
      title: string;
      description: string;
      amount?: number;
      tableName?: string;
      operator?: string;
      icon: string;
      color: string;
    };

    const activities: Activity[] = [];

    // Plačani računi
    for (const o of paidOrders) {
      activities.push({
        id: `paid-${o.id}`,
        type: "paid",
        timestamp: (o.paidAt || o.createdAt).toISOString(),
        title: `Račun plačan — ${o.table?.name || "Miza"}`,
        description: `${o.items.length} postavk · ${o.paymentMethod === "cash" ? "Gotovina" : o.paymentMethod === "card" ? "Kartica" : o.paymentMethod === "giftcard" ? "Darilna kartica" : "—"}${o.tip > 0 ? ` · napitnina ${o.tip.toFixed(2)}€` : ""}`,
        amount: o.total,
        tableName: o.table?.name,
        operator: o.operator,
        icon: "💳",
        color: "emerald",
      });
      // Posebej prikaži napitnino če je > 0
      if (o.tip > 0) {
        activities.push({
          id: `tip-${o.id}`,
          type: "tip",
          timestamp: (o.paidAt || o.createdAt).toISOString(),
          title: `🪙 Napitnina ${o.tip.toFixed(2)}€`,
          description: `${o.table?.name || "Miza"} · ${o.operator}`,
          amount: o.tip,
          tableName: o.table?.name,
          operator: o.operator,
          icon: "🪙",
          color: "amber",
        });
      }
    }

    // Nova naročila
    for (const o of openOrders) {
      activities.push({
        id: `order-${o.id}`,
        type: "order",
        timestamp: o.createdAt.toISOString(),
        title: `Novo naročilo — ${o.table?.name || "Miza"}`,
        description: `${o.items.length} postavk · ${o.operator}`,
        tableName: o.table?.name,
        operator: o.operator,
        icon: "🍽️",
        color: "amber",
      });
    }

    // Rezervacije
    for (const r of reservations) {
      activities.push({
        id: `res-${r.id}`,
        type: "reservation",
        timestamp: r.createdAt.toISOString(),
        title: `Rezervacija — ${r.customerName} (${r.partySize})`,
        description: `${r.table?.name || "Miza"} · ${r.time}${r.note ? ` · 📝 ${r.note}` : ""}`,
        tableName: r.table?.name,
        icon: "📅",
        color: "sky",
      });
    }

    // Sortiraj po času (najnovejše prvo) in omeji
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      activities: activities.slice(0, limit),
      total: activities.length,
    });
  } catch (e) {
    console.error("GET /api/activity-feed error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
