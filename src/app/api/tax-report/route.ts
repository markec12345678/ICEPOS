import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/tax-report?month=2025-07 — mesečno DDV poročilo za računovodstvo
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    // Parse month (YYYY-MM) ali uporabi trenutni mesec
    const monthParam = req.nextUrl.searchParams.get("month");
    const now = new Date();
    const year = monthParam ? parseInt(monthParam.split("-")[0]) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam.split("-")[1]) - 1 : now.getMonth();

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    // Vsi plačani računi v mesecu
    const orders = await db.order.findMany({
      where: {
        restaurantId: tenant.id,
        status: "paid",
        paidAt: { gte: startDate, lt: endDate },
      },
      include: {
        items: { select: { vatRate: true, unitPrice: true, quantity: true } },
      },
      orderBy: { paidAt: "asc" },
    });

    // Stornirani računi (negativni)
    const stornoOrders = orders.filter((o) => o.stornoOf);

    // DDV po stopnjah
    const vatBreakdown: Record<string, { base: number; vat: number; total: number; count: number }> = {};

    for (const order of orders) {
      if (order.stornoOf) continue; // storno računi se obravnavajo posebej

      for (const item of order.items) {
        const vatRate = item.vatRate;
        const key = vatRate.toFixed(3);
        if (!vatBreakdown[key]) {
          vatBreakdown[key] = { base: 0, vat: 0, total: 0, count: 0 };
        }
        const itemTotal = item.unitPrice * item.quantity;
        const itemBase = itemTotal / (1 + vatRate);
        const itemVat = itemTotal - itemBase;

        vatBreakdown[key].base += itemBase;
        vatBreakdown[key].vat += itemVat;
        vatBreakdown[key].total += itemTotal;
        vatBreakdown[key].count++;
      }
    }

    // Zaokroži
    const vatRates = Object.entries(vatBreakdown).map(([rate, v]) => ({
      rate: parseFloat(rate),
      ratePercent: parseFloat(rate) * 100,
      base: Math.round(v.base * 100) / 100,
      vat: Math.round(v.vat * 100) / 100,
      total: Math.round(v.total * 100) / 100,
      count: v.count,
    })).sort((a, b) => b.rate - a.rate);

    // Skupne metrike
    const validOrders = orders.filter((o) => !o.stornoOf);
    const stornos = orders.filter((o) => o.stornoOf);

    const totalRevenue = validOrders.reduce((s, o) => s + o.total, 0);
    const totalVat = vatRates.reduce((s, v) => s + v.vat, 0);
    const totalBase = vatRates.reduce((s, v) => s + v.base, 0);
    const stornoTotal = stornos.reduce((s, o) => s + Math.abs(o.total), 0);
    const netRevenue = totalRevenue - stornoTotal;

    // Po načinih plačila
    const byPaymentMethod: Record<string, { count: number; total: number; vat: number }> = {};
    for (const order of validOrders) {
      const method = order.paymentMethod || "unknown";
      if (!byPaymentMethod[method]) {
        byPaymentMethod[method] = { count: 0, total: 0, vat: 0 };
      }
      byPaymentMethod[method].count++;
      byPaymentMethod[method].total += order.total;
      byPaymentMethod[method].vat += order.vatTotal;
    }

    const paymentMethodStats = Object.entries(byPaymentMethod).map(([method, v]) => ({
      method,
      count: v.count,
      total: Math.round(v.total * 100) / 100,
      vat: Math.round(v.vat * 100) / 100,
    }));

    // Dnevna razčlenitev
    const byDay: Record<string, { revenue: number; vat: number; orders: number }> = {};
    for (const order of validOrders) {
      if (!order.paidAt) continue;
      const dayKey = order.paidAt.toISOString().slice(0, 10);
      if (!byDay[dayKey]) byDay[dayKey] = { revenue: 0, vat: 0, orders: 0 };
      byDay[dayKey].revenue += order.total;
      byDay[dayKey].vat += order.vatTotal;
      byDay[dayKey].orders++;
    }

    const dailyStats = Object.entries(byDay)
      .map(([date, v]) => ({
        date,
        revenue: Math.round(v.revenue * 100) / 100,
        vat: Math.round(v.vat * 100) / 100,
        orders: v.orders,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // FURS podatki
    const fursData = {
      taxNumber: tenant.taxNumber,
      businessUnit: tenant.businessUnit,
      cashRegister: tenant.cashRegister,
      restaurantName: tenant.name,
    };

    // Številke računov (prvi in zadnji)
    const firstInvoice = validOrders[0]?.invoiceNumber || "—";
    const lastInvoice = validOrders[validOrders.length - 1]?.invoiceNumber || "—";

    return NextResponse.json({
      period: {
        month: month + 1,
        year,
        monthLabel: new Date(year, month, 1).toLocaleDateString("sl-SI", { month: "long", year: "numeric" }),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalVat: Math.round(totalVat * 100) / 100,
        totalBase: Math.round(totalBase * 100) / 100,
        stornoTotal: Math.round(stornoTotal * 100) / 100,
        netRevenue: Math.round(netRevenue * 100) / 100,
        orderCount: validOrders.length,
        stornoCount: stornos.length,
        firstInvoice,
        lastInvoice,
      },
      vatRates,
      paymentMethodStats,
      dailyStats,
      fursData,
    });
  } catch (e) {
    console.error("GET /api/tax-report error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
