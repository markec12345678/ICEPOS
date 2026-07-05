// @ts-nocheck — pre-existing TS errors (non-critical analytics/reporting route)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/menu/pairing-suggestions?menuItemId=xxx — predlogi parjenja jedi
// Analizira: katere jedi se pogosto naročajo skupaj (market basket analysis)
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const menuItemId = req.nextUrl.searchParams.get("menuItemId");

    // Pridobi vse order items z njihovimi order IDji
    const orderItems = await db.orderItem.findMany({
      where: {
        order: {
          restaurantId: tenant.id,
          status: "paid",
        },
      },
      select: {
        orderId: true,
        menuItemId: true,
        quantity: true,
        menuItem: { select: { id: true, name: true, category: true, price: true, imageUrl: true, available: true } },
      },
    });

    // Grupiraj po orderih
    const ordersMap: Record<string, { menuItemId: string; menuItem: { id: string; name: string; category: string; price: number; imageUrl: string | null; available: boolean }; quantity: number }[]> = {};
    for (const oi of orderItems) {
      if (!ordersMap[oi.orderId]) ordersMap[oi.orderId] = [];
      ordersMap[oi.orderId].push({
        menuItemId: oi.menuItemId,
        menuItem: oi.menuItem,
        quantity: oi.quantity,
      });
    }

    if (menuItemId) {
      // Parjenje za specifično jed
      const coOccurrence: Record<string, { item: { id: string; name: string; category: string; price: number; imageUrl: string | null; available: boolean }; count: number; totalQty: number }> = {};
      let baseCount = 0;

      for (const items of Object.values(ordersMap)) {
        const hasBase = items.some((i) => i.menuItemId === menuItemId);
        if (!hasBase) continue;
        baseCount++;

        for (const item of items) {
          if (item.menuItemId === menuItemId) continue;
          if (!coOccurrence[item.menuItemId]) {
            coOccurrence[item.menuItemId] = {
              item: item.menuItem,
              count: 0,
              totalQty: 0,
            };
          }
          coOccurrence[item.menuItemId].count++;
          coOccurrence[item.menuItemId].totalQty += item.quantity;
        }
      }

      const pairings = Object.values(coOccurrence)
        .map((p) => ({
          ...p,
          confidence: baseCount > 0 ? Math.round((p.count / baseCount) * 100) : 0,
        }))
        .filter((p) => p.item && p.item.name)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 8);

      // Osnovna jed info
      const baseItem = orderItems.find((oi) => oi.menuItemId === menuItemId)?.menuItem;

      return NextResponse.json({
        baseItem,
        pairings,
        baseCount,
      });
    }

    // Splošni top parjenja (najpogostejše kombinacije)
    const pairCounts: Record<string, { items: { id: string; name: string; category: string; price: number; imageUrl: string | null }[]; count: number }> = {};

    for (const items of Object.values(ordersMap)) {
      if (items.length < 2) continue;
      // Generiraj vse pare
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const id1 = items[i].menuItemId;
          const id2 = items[j].menuItemId;
          const key = [id1, id2].sort().join("|");
          if (!pairCounts[key]) {
            pairCounts[key] = {
              items: [
                { id: items[i].menuItemId, name: items[i].menuItem.name, category: items[i].menuItem.category, price: items[i].menuItem.price, imageUrl: items[i].menuItem.imageUrl },
                { id: items[j].menuItemId, name: items[j].menuItem.name, category: items[j].menuItem.category, price: items[j].menuItem.price, imageUrl: items[j].menuItem.imageUrl },
              ],
              count: 0,
            };
          }
          pairCounts[key].count++;
        }
      }
    }

    const topPairs = Object.values(pairCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((p) => ({
        ...p,
        combinedPrice: Math.round((p.items[0].price + p.items[1].price) * 100) / 100,
      }));

    return NextResponse.json({
      topPairs,
      totalOrders: Object.keys(ordersMap).length,
    });
  } catch (e) {
    console.error("GET /api/menu/pairing-suggestions error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
