import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// Map kategorij na kuhinjske postaje
const STATION_MAP: Record<string, string> = {
  glavne_jedi: "Vroča postaja",
  predjedi: "Hladna postaja",
  sladice: "Sladice",
  pice: "Pijača",
  toplive_pijace: "Vroča pijača",
  hladne_pijace: "Hladna pijača",
  alkoholne_pijace: "Pijača",
  brezalkoholne_pijace: "Pijača",
};

// GET /api/kitchen/station-performance?days=7 — analiza postaj kuhinje
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const days = Math.min(parseInt(req.nextUrl.searchParams.get("days") || "7", 10), 30);
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Pridobi vse postavke iz plačanih naročil
    const orderItems = await db.orderItem.findMany({
      where: {
        order: {
          restaurantId: tenant.id,
          status: "paid",
          paidAt: { gte: since },
        },
      },
      include: {
        menuItem: { select: { id: true, name: true, category: true } },
        order: { select: { createdAt: true, paidAt: true } },
      },
    });

    // Grupiraj po postajah
    const stationMap: Record<string, {
      station: string;
      totalItems: number;
      totalOrders: number;
      avgPrepTime: number;
      minPrepTime: number;
      maxPrepTime: number;
      items: Record<string, { name: string; category: string; quantity: number; prepTimes: number[] }>;
    }> = {};

    for (const item of orderItems) {
      const category = item.menuItem?.category || "unknown";
      const station = STATION_MAP[category] || "Ostalo";

      if (!stationMap[station]) {
        stationMap[station] = {
          station,
          totalItems: 0,
          totalOrders: 0,
          avgPrepTime: 0,
          minPrepTime: 999,
          maxPrepTime: 0,
          items: {},
        };
      }

      // Prep time = čas od order.createdAt do order.paidAt (v minutah)
      const order = item.order;
      if (order.paidAt) {
        const prepTime = (order.paidAt.getTime() - order.createdAt.getTime()) / 60000;
        if (prepTime > 0 && prepTime < 300) {
          stationMap[station].avgPrepTime += prepTime;
          stationMap[station].minPrepTime = Math.min(stationMap[station].minPrepTime, prepTime);
          stationMap[station].maxPrepTime = Math.max(stationMap[station].maxPrepTime, prepTime);
        }
      }

      stationMap[station].totalItems += item.quantity;
      stationMap[station].totalOrders++;

      // Po jedi
      const itemKey = item.menuItemId;
      if (!stationMap[station].items[itemKey]) {
        stationMap[station].items[itemKey] = {
          name: item.menuItem?.name || "Neznano",
          category,
          quantity: 0,
          prepTimes: [],
        };
      }
      stationMap[station].items[itemKey].quantity += item.quantity;
      if (order.paidAt) {
        const prepTime = (order.paidAt.getTime() - order.createdAt.getTime()) / 60000;
        if (prepTime > 0 && prepTime < 300) {
          stationMap[station].items[itemKey].prepTimes.push(prepTime);
        }
      }
    }

    // Izračunaj povprečja in formatiraj
    const stations = Object.values(stationMap).map((s) => {
      const avgPrep = s.totalOrders > 0 ? s.avgPrepTime / s.totalOrders : 0;
      const items = Object.entries(s.items)
        .map(([id, item]) => {
          const avgItemPrep = item.prepTimes.length > 0
            ? item.prepTimes.reduce((a, b) => a + b, 0) / item.prepTimes.length
            : 0;
          return {
            id,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            avgPrepTime: Math.round(avgItemPrep),
            orderCount: item.prepTimes.length,
          };
        })
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      return {
        station: s.station,
        totalItems: s.totalItems,
        totalOrders: s.totalOrders,
        avgPrepTime: Math.round(avgPrep),
        minPrepTime: s.minPrepTime === 999 ? 0 : Math.round(s.minPrepTime),
        maxPrepTime: Math.round(s.maxPrepTime),
        items,
      };
    }).sort((a, b) => b.totalItems - a.totalItems);

    // Skupne metrike
    const totalItems = stations.reduce((s, st) => s + st.totalItems, 0);
    const totalOrders = stations.reduce((s, st) => s + st.totalOrders, 0);
    const overallAvgPrep = totalOrders > 0
      ? Math.round(stations.reduce((s, st) => s + st.avgPrepTime * st.totalOrders, 0) / totalOrders)
      : 0;

    // Najpočasnejša postaja
    const slowestStation = [...stations].sort((a, b) => b.avgPrepTime - a.avgPrepTime)[0];
    const fastestStation = [...stations].sort((a, b) => a.avgPrepTime - b.avgPrepTime)[0];

    return NextResponse.json({
      stations,
      summary: {
        totalItems,
        totalOrders,
        overallAvgPrep,
        stationCount: stations.length,
        slowestStation: slowestStation ? { station: slowestStation.station, avgPrepTime: slowestStation.avgPrepTime } : null,
        fastestStation: fastestStation ? { station: fastestStation.station, avgPrepTime: fastestStation.avgPrepTime } : null,
      },
      days,
    });
  } catch (e) {
    console.error("GET /api/kitchen/station-performance error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
