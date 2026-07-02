import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/customers/[id]/visit-analytics — analitika obiskov stranke
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const { id } = await params;

    const customer = await db.customer.findFirst({
      where: { id, restaurantId: tenant.id },
    });

    if (!customer) {
      return NextResponse.json({ error: "Stranka ni najdena" }, { status: 404 });
    }

    const orders = await db.order.findMany({
      where: {
        status: "paid",
        OR: [
          { customerId: id },
        ],
      },
      include: {
        table: { select: { name: true, section: true } },
        items: {
          include: {
            menuItem: { select: { id: true, name: true, category: true } },
          },
        },
      },
      orderBy: { paidAt: "desc" },
    });

    if (orders.length === 0) {
      return NextResponse.json({
        totalVisits: 0,
        totalSpent: 0,
        avgOrderValue: 0,
        favoriteItems: [],
        monthlyTrend: [],
        visitFrequency: "new",
        firstVisit: null,
        lastVisit: null,
        avgDaysBetweenVisits: 0,
        preferredSection: null,
        preferredPaymentMethod: null,
      });
    }

    // Osnovne metrike
    const totalVisits = orders.length;
    const totalSpent = orders.reduce((s, o) => s + o.total, 0);
    const totalTips = orders.reduce((s, o) => s + (o.tip || 0), 0);
    const avgOrderValue = totalSpent / totalVisits;

    // Prvi in zadnji obisk
    const firstVisit = orders[orders.length - 1];
    const lastVisit = orders[0];

    // Pogostost obiskov (povprečni dnevi med obiski)
    const visitDates = orders.map((o) => o.paidAt || o.createdAt).sort((a, b) => a.getTime() - b.getTime());
    let totalDaysBetween = 0;
    for (let i = 1; i < visitDates.length; i++) {
      totalDaysBetween += (visitDates[i].getTime() - visitDates[i - 1].getTime()) / 86400000;
    }
    const avgDaysBetweenVisits = visitDates.length > 1 ? totalDaysBetween / (visitDates.length - 1) : 0;

    // Favorite items (top 5 po količini)
    const itemStats: Record<string, { name: string; category: string; quantity: number; revenue: number }> = {};
    for (const order of orders) {
      for (const item of order.items) {
        const key = item.menuItemId;
        if (!itemStats[key]) {
          itemStats[key] = {
            name: item.menuItem?.name || "Neznano",
            category: item.menuItem?.category || "",
            quantity: 0,
            revenue: 0,
          };
        }
        itemStats[key].quantity += item.quantity;
        itemStats[key].revenue += item.unitPrice * item.quantity;
      }
    }
    const favoriteItems = Object.values(itemStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Mesečni trend (zadnjih 12 mesecev)
    const monthlyTrend: { month: string; visits: number; spent: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toISOString().slice(0, 7);
      const monthLabel = d.toLocaleDateString("sl-SI", { month: "short", year: "2-digit" });
      const monthOrders = orders.filter((o) => {
        if (!o.paidAt) return false;
        return o.paidAt.toISOString().slice(0, 7) === monthKey;
      });
      monthlyTrend.push({
        month: monthLabel,
        visits: monthOrders.length,
        spent: Math.round(monthOrders.reduce((s, o) => s + o.total, 0) * 100) / 100,
      });
    }

    // Preferirana sekcija
    const sectionCounts: Record<string, number> = {};
    for (const o of orders) {
      const section = o.table?.section || "—";
      sectionCounts[section] = (sectionCounts[section] || 0) + 1;
    }
    const preferredSection = Object.entries(sectionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Preferirani način plačila
    const paymentCounts: Record<string, number> = {};
    for (const o of orders) {
      const method = o.paymentMethod || "unknown";
      paymentCounts[method] = (paymentCounts[method] || 0) + 1;
    }
    const preferredPaymentMethod = Object.entries(paymentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Visit frequency classification
    let visitFrequency: "vip" | "regular" | "occasional" | "new" = "new";
    if (totalVisits >= 15 || totalSpent >= 500) visitFrequency = "vip";
    else if (totalVisits >= 5) visitFrequency = "regular";
    else if (totalVisits >= 2) visitFrequency = "occasional";

    // Dan v tednu preference
    const dayOfWeekCounts: Record<number, number> = {};
    for (const o of orders) {
      if (o.paidAt) {
        const dow = o.paidAt.getDay();
        dayOfWeekCounts[dow] = (dayOfWeekCounts[dow] || 0) + 1;
      }
    }
    const dayNames = ["Nedelja", "Ponedeljek", "Torek", "Sreda", "Četrtek", "Petek", "Sobota"];
    const preferredDay = Object.entries(dayOfWeekCounts).sort((a, b) => b[1] - a[1])[0];
    const preferredDayName = preferredDay ? dayNames[parseInt(preferredDay[0])] : null;

    return NextResponse.json({
      totalVisits,
      totalSpent: Math.round(totalSpent * 100) / 100,
      totalTips: Math.round(totalTips * 100) / 100,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      favoriteItems: favoriteItems.map((i) => ({
        ...i,
        revenue: Math.round(i.revenue * 100) / 100,
      })),
      monthlyTrend,
      visitFrequency,
      firstVisit: firstVisit.paidAt?.toISOString() || firstVisit.createdAt.toISOString(),
      lastVisit: lastVisit.paidAt?.toISOString() || lastVisit.createdAt.toISOString(),
      avgDaysBetweenVisits: Math.round(avgDaysBetweenVisits * 10) / 10,
      preferredSection,
      preferredPaymentMethod,
      preferredDayName,
    });
  } catch (e) {
    console.error("GET /api/customers/[id]/visit-analytics error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
