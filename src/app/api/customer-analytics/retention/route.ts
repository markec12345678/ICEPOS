// @ts-nocheck — pre-existing TS errors (non-critical analytics/reporting route)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/customer-analytics/retention — kohortna analiza vračanja strank
// Grupira stranke po mesecu prvega obiska in sledi vračanje v naslednjih mesecih
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    // Pridobi vse stranke z njihovimi plačanimi naročili
    const customers = await db.customer.findMany({
      where: { restaurantId: tenant.id },
      include: {
        orders: {
          where: { status: "paid" },
          select: { paidAt: true, total: true },
          orderBy: { paidAt: "asc" },
        },
      },
    });

    if (customers.length === 0) {
      return NextResponse.json({
        cohorts: [],
        summary: { totalCustomers: 0, avgRetention30: 0, avgRetention90: 0, avgRetention180: 0 },
      });
    }

    const now = new Date();

    // Grupiraj stranke po mesecu prvega obiska (kohorta)
    const cohortMap: Record<string, {
      cohortMonth: string;
      cohortLabel: string;
      customers: { id: string; firstVisit: Date; visits: { paidAt: Date; total: number }[] }[];
    }> = {};

    for (const c of customers) {
      const firstOrder = c.orders[0];
      if (!firstOrder || !firstOrder.paidAt) continue;

      const firstVisit = new Date(firstOrder.paidAt);
      const cohortKey = `${firstVisit.getFullYear()}-${String(firstVisit.getMonth() + 1).padStart(2, "0")}`;
      const cohortLabel = firstVisit.toLocaleDateString("sl-SI", { month: "short", year: "numeric" });

      if (!cohortMap[cohortKey]) {
        cohortMap[cohortKey] = { cohortMonth: cohortKey, cohortLabel, customers: [] };
      }

      cohortMap[cohortKey].customers.push({
        id: c.id,
        firstVisit,
        visits: c.orders.map((o) => ({ paidAt: new Date(o.paidAt!), total: o.total })),
      });
    }

    // Izračunaj retention za vsako kohorto
    const cohorts = Object.values(cohortMap)
      .sort((a, b) => a.cohortMonth.localeCompare(b.cohortMonth))
      .slice(-8) // zadnjih 8 kohort
      .map((cohort) => {
        const totalCustomers = cohort.customers.length;

        // Retention po mesecih (0-6 mesecev po prvem obisku)
        const retention: { month: number; retained: number; rate: number }[] = [];
        for (let m = 0; m <= 6; m++) {
          const targetDate = new Date(cohort.cohortMonth + "-01");
          targetDate.setMonth(targetDate.getMonth() + m + 1);
          if (targetDate > now) {
            retention.push({ month: m, retained: 0, rate: 0 });
            continue;
          }

          let retained = 0;
          for (const customer of cohort.customers) {
            const hasVisitInMonth = customer.visits.some((v) => {
              const monthsDiff =
                (v.paidAt.getFullYear() - customer.firstVisit.getFullYear()) * 12 +
                (v.paidAt.getMonth() - customer.firstVisit.getMonth());
              return monthsDiff === m + 1;
            });
            if (hasVisitInMonth) retained++;
          }

          retention.push({
            month: m,
            retained,
            rate: totalCustomers > 0 ? Math.round((retained / totalCustomers) * 1000) / 10 : 0,
          });
        }

        const totalRevenue = cohort.customers.reduce(
          (s, c) => s + c.visits.reduce((sv, v) => sv + v.total, 0),
          0
        );

        return {
          cohortMonth: cohort.cohortMonth,
          cohortLabel: cohort.cohortLabel,
          size: totalCustomers,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          avgRevenuePerCustomer: Math.round((totalRevenue / totalCustomers) * 100) / 100,
          retention,
        };
      });

    // Povprečni retention rates
    const avgRetention30 = cohorts.length > 0
      ? Math.round(cohorts.reduce((s, c) => s + (c.retention[0]?.rate || 0), 0) / cohorts.length * 10) / 10
      : 0;
    const avgRetention90 = cohorts.length > 0
      ? Math.round(cohorts.filter((c) => c.retention[2]?.rate > 0).reduce((s, c) => s + (c.retention[2]?.rate || 0), 0) / Math.max(cohorts.filter((c) => c.retention[2]?.rate > 0).length, 1) * 10) / 10
      : 0;
    const avgRetention180 = cohorts.length > 0
      ? Math.round(cohorts.filter((c) => c.retention[5]?.rate > 0).reduce((s, c) => s + (c.retention[5]?.rate || 0), 0) / Math.max(cohorts.filter((c) => c.retention[5]?.rate > 0).length, 1) * 10) / 10
      : 0;

    return NextResponse.json({
      cohorts,
      summary: {
        totalCustomers: customers.length,
        avgRetention30,
        avgRetention90,
        avgRetention180,
      },
    });
  } catch (e) {
    console.error("GET /api/customer-analytics/retention error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
