import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/loyalty-history — zgodovina točk zvestobe
// Podpora za ?customerId=xxx (posamezna stranka) ali ?from=&to=
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const customerId = req.nextUrl.searchParams.get("customerId");
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");

    const now = new Date();
    const startDate = from ? new Date(from + "T00:00:00") : new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to + "T23:59:59") : now;

    // Pridobi stranke
    const customersWhere: { restaurantId: string; id?: string } = { restaurantId: tenant.id };
    if (customerId) customersWhere.id = customerId;

    const customers = await db.customer.findMany({
      where: customersWhere,
      orderBy: { totalSpent: "desc" },
      take: customerId ? 1 : 50,
    });

    // Pridobi plačane račune v obdobju
    const ordersWhere: {
      restaurantId: string;
      status: string;
      paidAt?: { gte: Date; lte: Date };
      customerId?: string;
    } = {
      restaurantId: tenant.id,
      status: "paid",
      paidAt: { gte: startDate, lte: endDate },
    };
    if (customerId) ordersWhere.customerId = customerId;

    const orders = await db.order.findMany({
      where: ordersWhere,
      orderBy: { paidAt: "desc" },
      include: { customer: true },
      take: 500,
    });

    // Samo računi s povezano stranko
    const customerOrders = orders.filter((o) => o.customerId !== null);

    // Za vsako stranko zgradi zgodovino
    const customerHistories = customers.map((customer) => {
      const customerOrds = customerOrders.filter((o) => o.customerId === customer.id);

      // Izračunaj točke (1 točka na X EUR, glede na loyaltyRate)
      const loyaltyRate = tenant.loyaltyRate || 0.1; // privzeto 1 točka na 10 EUR
      const pointsEarned = Math.floor(customerOrds.reduce((s, o) => s + o.total, 0) * loyaltyRate);

      const transactions = customerOrds.map((o) => ({
        orderId: o.id,
        invoiceNumber: o.invoiceNumber,
        paidAt: o.paidAt?.toISOString() || null,
        amount: o.total,
        pointsEarned: Math.floor(o.total * loyaltyRate),
        paymentMethod: o.paymentMethod,
      }));

      const totalSpentInPeriod = customerOrds.reduce((s, o) => s + o.total, 0);
      const avgOrderValue = customerOrds.length > 0 ? totalSpentInPeriod / customerOrds.length : 0;

      return {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        currentPoints: customer.points,
        totalSpent: customer.totalSpent,
        visitCount: customer.visitCount,
        // Period stats
        ordersInPeriod: customerOrds.length,
        totalSpentInPeriod,
        pointsEarnedInPeriod: pointsEarned,
        avgOrderValue,
        transactions: transactions.slice(0, 20), // zadnjih 20
        lastVisit: customerOrds[0]?.paidAt?.toISOString() || null,
      };
    });

    // Povzetek
    const totalCustomers = customers.length;
    const activeInPeriod = customerHistories.filter((c) => c.ordersInPeriod > 0).length;
    const totalPointsEarned = customerHistories.reduce((s, c) => s + c.pointsEarnedInPeriod, 0);
    const totalSpentInPeriod = customerHistories.reduce((s, c) => s + c.totalSpentInPeriod, 0);
    const totalCurrentPoints = customers.reduce((s, c) => s + c.points, 0);

    // Top stranke po točkah v obdobju
    const topEarners = [...customerHistories]
      .filter((c) => c.pointsEarnedInPeriod > 0)
      .sort((a, b) => b.pointsEarnedInPeriod - a.pointsEarnedInPeriod)
      .slice(0, 10);

    // Mesečni pregled točk
    const monthlyMap = new Map<string, { month: string; pointsEarned: number; totalSpent: number; orderCount: number }>();
    for (const o of customerOrders) {
      const monthKey = (o.paidAt || o.createdAt).toISOString().slice(0, 7);
      const existing = monthlyMap.get(monthKey);
      const points = Math.floor(o.total * (tenant.loyaltyRate || 0.1));
      if (existing) {
        existing.pointsEarned += points;
        existing.totalSpent += o.total;
        existing.orderCount++;
      } else {
        monthlyMap.set(monthKey, {
          month: monthKey,
          pointsEarned: points,
          totalSpent: o.total,
          orderCount: 1,
        });
      }
    }

    return NextResponse.json({
      period: {
        from: startDate.toISOString().slice(0, 10),
        to: endDate.toISOString().slice(0, 10),
      },
      loyaltyRate: tenant.loyaltyRate,
      customers: customerHistories,
      topEarners,
      monthly: Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
      summary: {
        totalCustomers,
        activeInPeriod,
        totalPointsEarned,
        totalSpentInPeriod,
        totalCurrentPoints,
        avgPointsPerCustomer: totalCustomers > 0 ? totalPointsEarned / totalCustomers : 0,
        avgSpentPerCustomer: activeInPeriod > 0 ? totalSpentInPeriod / activeInPeriod : 0,
      },
    });
  } catch (e) {
    console.error("GET /api/loyalty-history error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju zgodovine točk" }, { status: 500 });
  }
}
