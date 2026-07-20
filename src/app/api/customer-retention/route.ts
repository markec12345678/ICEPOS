import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/customer-retention — analitika vračanja gostov
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const customers = await db.customer.findMany({
      where: { restaurantId: tenant.id },
      orderBy: { createdAt: "desc" },
    });

    // Osnovne metrike
    const total = customers.length;
    const repeatCustomers = customers.filter((c) => c.visitCount > 1);
    const oneTimeCustomers = customers.filter((c) => c.visitCount === 1);
    const repeatRate = total > 0 ? (repeatCustomers.length / total) * 100 : 0;

    // Povprečno število obiskov
    const avgVisits = total > 0
      ? customers.reduce((s, c) => s + c.visitCount, 0) / total
      : 0;

    // Povprečna poraba
    const avgSpent = total > 0
      ? customers.reduce((s, c) => s + c.totalSpent, 0) / total
      : 0;

    // Vip stranke (več kot 10 obiskov ali več kot 500€)
    const vipCustomers = customers.filter(
      (c) => c.visitCount >= 10 || c.totalSpent >= 500
    );

    // Segmentacija po številu obiskov
    const segments = [
      { segment: "Novi (1 obisk)", count: customers.filter((c) => c.visitCount === 1).length, color: "amber" },
      { segment: "Redni (2-5 obiskov)", count: customers.filter((c) => c.visitCount >= 2 && c.visitCount <= 5).length, color: "blue" },
      { segment: "Zvesti (6-15 obiskov)", count: customers.filter((c) => c.visitCount >= 6 && c.visitCount <= 15).length, color: "emerald" },
      { segment: "VIP (16+ obiskov)", count: customers.filter((c) => c.visitCount >= 16).length, color: "purple" },
    ];

    // Segmentacija po porabi
    const spendingSegments = [
      { segment: "0-50€", count: customers.filter((c) => c.totalSpent < 50).length },
      { segment: "50-200€", count: customers.filter((c) => c.totalSpent >= 50 && c.totalSpent < 200).length },
      { segment: "200-500€", count: customers.filter((c) => c.totalSpent >= 200 && c.totalSpent < 500).length },
      { segment: "500-1000€", count: customers.filter((c) => c.totalSpent >= 500 && c.totalSpent < 1000).length },
      { segment: "1000€+", count: customers.filter((c) => c.totalSpent >= 1000).length },
    ];

    // Neaktivne stranke (brez obiska v zadnjih 90 dneh — približno)
    // Ker nimamo "lastVisitDate", uporabimo updatedAt kot proxy
    const now = new Date();
    const days90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const inactiveCustomers = customers.filter(
      (c) => c.updatedAt < days90Ago && c.visitCount > 0
    );

    // Mesečne nove stranke (za graf)
    const monthlyMap = new Map<string, { month: string; newCustomers: number }>();
    for (const c of customers) {
      const monthKey = c.createdAt.toISOString().slice(0, 7);
      const existing = monthlyMap.get(monthKey);
      if (existing) {
        existing.newCustomers++;
      } else {
        monthlyMap.set(monthKey, { month: monthKey, newCustomers: 1 });
      }
    }

    // Top stranke po številu obiskov
    const topByVisits = [...customers]
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 10)
      .map((c) => ({
        id: c.id,
        name: c.name,
        visitCount: c.visitCount,
        totalSpent: c.totalSpent,
        points: c.points,
        avgBasketSize: c.visitCount > 0 ? c.totalSpent / c.visitCount : 0,
      }));

    // Top stranke po porabi
    const topBySpent = [...customers]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map((c) => ({
        id: c.id,
        name: c.name,
        visitCount: c.visitCount,
        totalSpent: c.totalSpent,
        points: c.points,
        avgBasketSize: c.visitCount > 0 ? c.totalSpent / c.visitCount : 0,
      }));

    // Churn risk (stranke z nizkim številom obiskov in dolgo nazaj)
    const churnRisk = customers
      .filter((c) => c.visitCount >= 2 && c.updatedAt < days90Ago)
      .slice(0, 10)
      .map((c) => ({
        id: c.id,
        name: c.name,
        visitCount: c.visitCount,
        totalSpent: c.totalSpent,
        lastActivity: c.updatedAt.toISOString(),
        daysSinceLastActivity: Math.floor((now.getTime() - c.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
      }));

    // Celotna vrednost baze strank
    const totalCustomerValue = customers.reduce((s, c) => s + c.totalSpent, 0);
    const avgLifetimeValue = total > 0 ? totalCustomerValue / total : 0;

    return NextResponse.json({
      summary: {
        total,
        repeatCustomers: repeatCustomers.length,
        oneTimeCustomers: oneTimeCustomers.length,
        repeatRate,
        avgVisits,
        avgSpent,
        vipCustomers: vipCustomers.length,
        inactiveCustomers: inactiveCustomers.length,
        totalCustomerValue,
        avgLifetimeValue,
      },
      segments,
      spendingSegments,
      monthly: Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
      topByVisits,
      topBySpent,
      churnRisk,
    });
  } catch (e) {
    console.error("GET /api/customer-retention error:", e);
    return NextResponse.json({ error: "Napaka pri analizi vračanja" }, { status: 500 });
  }
}
