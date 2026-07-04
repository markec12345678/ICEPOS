// @ts-nocheck — pre-existing TS errors (non-critical route)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/customer-analytics/clv — Customer Lifetime Value analiza
// Top stranke po vrednosti skozi čas, s predikcijo prihodnje vrednosti
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const customers = await db.customer.findMany({
      where: { restaurantId: tenant.id },
      include: {
        orders: {
          where: { status: "paid" },
          select: {
            total: true,
            tip: true,
            paidAt: true,
            createdAt: true,
          },
          orderBy: { paidAt: "asc" },
        },
      },
    });

    const now = new Date();
    const analyzedCustomers = customers
      .map((c) => {
        const orders = c.orders;
        const totalSpent = orders.reduce((s, o) => s + o.total, 0);
        const totalTips = orders.reduce((s, o) => s + (o.tip || 0), 0);
        const visitCount = orders.length;
        const avgOrderValue = visitCount > 0 ? totalSpent / visitCount : 0;

        // Čas od prvega do zadnjega obiska (v dnevih)
        const firstVisit = orders[0]?.paidAt || orders[0]?.createdAt;
        const lastVisit = orders[orders.length - 1]?.paidAt || orders[orders.length - 1]?.createdAt;
        const customerAgeDays = firstVisit
          ? Math.max(1, (now.getTime() - new Date(firstVisit).getTime()) / 86400000)
          : 0;
        const daysBetweenFirstLast = firstVisit && lastVisit
          ? Math.max(1, (new Date(lastVisit).getTime() - new Date(firstVisit).getTime()) / 86400000)
          : 0;

        // Pogostost obiskov (obiski na mesec)
        const visitsPerMonth = customerAgeDays > 0 ? (visitCount / customerAgeDays) * 30 : 0;

        // Povprečni dnevi med obiski
        let avgDaysBetween = 0;
        if (orders.length > 1) {
          let totalDays = 0;
          for (let i = 1; i < orders.length; i++) {
            const prev = new Date(orders[i - 1].paidAt || orders[i - 1].createdAt).getTime();
            const curr = new Date(orders[i].paidAt || orders[i].createdAt).getTime();
            totalDays += (curr - prev) / 86400000;
          }
          avgDaysBetween = totalDays / (orders.length - 1);
        }

        // CLV predikcija: avgOrderValue × visitsPerMonth × 12 (naslednje leto)
        const projectedYearlyValue = avgOrderValue * visitsPerMonth * 12;

        // CLV z 3-letno projekcijo (z upoštevanjem churn rate 20%)
        const churnRate = 0.2;
        const clv3Year = projectedYearlyValue * (1 + (1 - churnRate) + Math.pow(1 - churnRate, 2));

        // Dnevi od zadnjega obiska
        const daysSinceLastVisit = lastVisit
          ? Math.floor((now.getTime() - new Date(lastVisit).getTime()) / 86400000)
          : 999;

        // Status: active / at_risk / churned
        let status: "active" | "at_risk" | "churned" = "active";
        if (daysSinceLastVisit > 90) status = "churned";
        else if (daysSinceLastVisit > 45) status = "at_risk";

        // Segmentacija po vrednosti
        let segment: "platinum" | "gold" | "silver" | "bronze" | "new" = "new";
        if (totalSpent >= 1000) segment = "platinum";
        else if (totalSpent >= 500) segment = "gold";
        else if (totalSpent >= 200) segment = "silver";
        else if (totalSpent >= 50) segment = "bronze";

        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          points: c.points,
          totalSpent: Math.round(totalSpent * 100) / 100,
          totalTips: Math.round(totalTips * 100) / 100,
          visitCount,
          avgOrderValue: Math.round(avgOrderValue * 100) / 100,
          firstVisit: firstVisit?.toISOString() || null,
          lastVisit: lastVisit?.toISOString() || null,
          customerAgeDays: Math.round(customerAgeDays),
          visitsPerMonth: Math.round(visitsPerMonth * 10) / 10,
          avgDaysBetween: Math.round(avgDaysBetween * 10) / 10,
          projectedYearlyValue: Math.round(projectedYearlyValue * 100) / 100,
          clv3Year: Math.round(clv3Year * 100) / 100,
          daysSinceLastVisit,
          status,
          segment,
        };
      })
      .filter((c) => c.visitCount > 0)
      .sort((a, b) => b.clv3Year - a.clv3Year);

    // Skupne metrike
    const totalCustomers = analyzedCustomers.length;
    const totalCLV = analyzedCustomers.reduce((s, c) => s + c.clv3Year, 0);
    const avgCLV = totalCustomers > 0 ? totalCLV / totalCustomers : 0;

    // Po segmentih
    const segmentStats: Record<string, { count: number; totalValue: number; avgCLV: number }> = {};
    for (const c of analyzedCustomers) {
      if (!segmentStats[c.segment]) segmentStats[c.segment] = { count: 0, totalValue: 0, avgCLV: 0 };
      segmentStats[c.segment].count++;
      segmentStats[c.segment].totalValue += c.clv3Year;
    }
    for (const seg of Object.keys(segmentStats)) {
      segmentStats[seg].avgCLV = Math.round((segmentStats[seg].totalValue / segmentStats[seg].count) * 100) / 100;
      segmentStats[seg].totalValue = Math.round(segmentStats[seg].totalValue * 100) / 100;
    }

    // Po statusu
    const statusStats = {
      active: analyzedCustomers.filter((c) => c.status === "active").length,
      at_risk: analyzedCustomers.filter((c) => c.status === "at_risk").length,
      churned: analyzedCustomers.filter((c) => c.status === "churned").length,
    };

    return NextResponse.json({
      customers: analyzedCustomers.slice(0, 20), // top 20
      summary: {
        totalCustomers,
        totalCLV: Math.round(totalCLV * 100) / 100,
        avgCLV: Math.round(avgCLV * 100) / 100,
        statusStats,
        segmentStats,
      },
    });
  } catch (e) {
    console.error("GET /api/customer-analytics/clv error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
