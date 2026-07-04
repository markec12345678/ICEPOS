// @ts-nocheck — pre-existing TS errors (Task U1)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/customer-analytics?days=90 — CRM analitika strank
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const days = parseInt(req.nextUrl.searchParams.get("days") || "90", 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const customers = await db.customer.findMany({
      where: { restaurantId: tenant.id },
      include: {
        orders: {
          where: { status: "paid", paidAt: { gte: since } },
          select: { total: true, tip: true, paidAt: true, paymentMethod: true },
        },
      },
    });

    // Segmentacija strank
    const segments = {
      vip: [] as typeof customerStats[],
      regular: [] as typeof customerStats[],
      occasional: [] as typeof customerStats[],
      new: [] as typeof customerStats[],
      inactive: [] as typeof customerStats[],
    };

    type CustomerStat = {
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
      points: number;
      totalSpent: number;
      visitCount: number;
      avgOrder: number;
      tips: number;
      lastVisit: string | null;
      daysSinceLastVisit: number | null;
      level: string;
      segment: string;
    };

    const customerStats: CustomerStat[] = [];

    for (const c of customers) {
      const orders = c.orders;
      const totalSpent = orders.reduce((s, o) => s + o.total, 0);
      const tips = orders.reduce((s, o) => s + (o.tip || 0), 0);
      const visitCount = orders.length;
      const avgOrder = visitCount > 0 ? totalSpent / visitCount : 0;
      const lastOrder = orders
        .filter((o) => o.paidAt)
        .sort((a, b) => new Date(b.paidAt!).getTime() - new Date(a.paidAt!).getTime())[0];
      const lastVisit = lastOrder?.paidAt?.toISOString() || null;
      const daysSinceLastVisit = lastVisit
        ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / 86400000)
        : null;

      // Level
      let level = "Novinec";
      if (c.points >= 500) level = "Zlato";
      else if (c.points >= 200) level = "Srebro";
      else if (c.points >= 100) level = "Bronca";

      // Segmentacija
      let segment = "inactive";
      if (totalSpent >= 500 || visitCount >= 15) segment = "vip";
      else if (visitCount >= 5 || totalSpent >= 200) segment = "regular";
      else if (visitCount >= 1) segment = "occasional";
      else if (c.createdAt > since) segment = "new";
      else segment = "inactive";

      const stat: CustomerStat = {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        points: c.points,
        totalSpent: Math.round(totalSpent * 100) / 100,
        visitCount,
        avgOrder: Math.round(avgOrder * 100) / 100,
        tips: Math.round(tips * 100) / 100,
        lastVisit,
        daysSinceLastVisit,
        level,
        segment,
      };

      customerStats.push(stat);
      segments[segment as keyof typeof segments]?.push(stat);
    }

    // Skupne metrike
    const totalCustomers = customers.length;
    const totalRevenue = customerStats.reduce((s, c) => s + c.totalSpent, 0);
    const totalVisits = customerStats.reduce((s, c) => s + c.visitCount, 0);
    const avgCustomerValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
    const avgVisitsPerCustomer = totalCustomers > 0 ? totalVisits / totalCustomers : 0;

    // Top 5 stranke po porabi
    const topCustomers = [...customerStats]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // Pridobljene stranke v obdobju
    const newCustomers = customers.filter((c) => c.createdAt > since).length;

    // Retention (stranke z >1 obiskom)
    const returningCustomers = customerStats.filter((c) => c.visitCount > 1).length;
    const retentionRate = totalCustomers > 0
      ? Math.round((returningCustomers / totalCustomers) * 100)
      : 0;

    return NextResponse.json({
      customers: customerStats.sort((a, b) => b.totalSpent - a.totalSpent),
      segments: {
        vip: segments.vip.length,
        regular: segments.regular.length,
        occasional: segments.occasional.length,
        new: segments.new.length,
        inactive: segments.inactive.length,
      },
      topCustomers,
      summary: {
        totalCustomers,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalVisits,
        avgCustomerValue: Math.round(avgCustomerValue * 100) / 100,
        avgVisitsPerCustomer: Math.round(avgVisitsPerCustomer * 10) / 10,
        newCustomers,
        returningCustomers,
        retentionRate,
      },
      days,
    });
  } catch (e) {
    console.error("GET /api/customer-analytics error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
