import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/ddv-report — davčno poročilo po DDV stopnjah
// Podpora za ?from=YYYY-MM-DD&to=YYYY-MM-DD (privzeto: trenutni mesec)
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");

    // Privzeto: trenutni mesec
    const now = new Date();
    const startDate = from
      ? new Date(from + "T00:00:00")
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = to
      ? new Date(to + "T23:59:59")
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Vsi plačani računi v obdobju (izključimo storno)
    const orders = await db.order.findMany({
      where: {
        restaurantId: tenant.id,
        status: "paid",
        paidAt: {
          gte: startDate,
          lte: endDate,
        },
        stornoOf: null,
      },
      include: {
        items: true,
      },
      orderBy: { paidAt: "asc" },
    });

    // Stornirani računi v obdobju (za odbitek)
    const stornoOrders = await db.order.findMany({
      where: {
        restaurantId: tenant.id,
        status: "storno",
        stornoAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: true,
      },
    });

    // Funkcija za agregacijo po DDV stopnjah
    function aggregateByVat(ords: typeof orders) {
      const buckets = new Map<
        number,
        { rate: number; net: number; vat: number; gross: number; count: number }
      >();

      for (const order of ords) {
        for (const item of order.items) {
          const lineGross = item.unitPrice * item.quantity;
          const lineNet = lineGross / (1 + item.vatRate);
          const lineVat = lineGross - lineNet;
          const existing = buckets.get(item.vatRate);
          if (existing) {
            existing.net += lineNet;
            existing.vat += lineVat;
            existing.gross += lineGross;
            existing.count++;
          } else {
            buckets.set(item.vatRate, {
              rate: item.vatRate,
              net: lineNet,
              vat: lineVat,
              gross: lineGross,
              count: 1,
            });
          }
        }
      }

      return Array.from(buckets.values()).sort((a, b) => b.rate - a.rate);
    }

    const salesVat = aggregateByVat(orders);
    const stornoVat = aggregateByVat(stornoOrders);

    // Skupne vrednosti
    const totalSalesGross = orders.reduce((s, o) => s + o.total, 0);
    const totalSalesVat = orders.reduce((s, o) => s + o.vatTotal, 0);
    const totalSalesNet = totalSalesGross - totalSalesVat;
    const totalTips = orders.reduce((s, o) => s + (o.tip || 0), 0);

    const totalStornoGross = stornoOrders.reduce((s, o) => s + o.total, 0);
    const totalStornoVat = stornoOrders.reduce((s, o) => s + o.vatTotal, 0);

    // Po plačilnih metodah
    const byPaymentMethod = orders.reduce(
      (acc, o) => {
        const method = o.paymentMethod || "unknown";
        if (!acc[method]) {
          acc[method] = { method, count: 0, gross: 0, vat: 0 };
        }
        acc[method].count++;
        acc[method].gross += o.total;
        acc[method].vat += o.vatTotal;
        return acc;
      },
      {} as Record<string, { method: string; count: number; gross: number; vat: number }>
    );

    // Dnevna agregacija (za graf)
    const dailyMap = new Map<
      string,
      { date: string; gross: number; vat: number; net: number; count: number }
    >();

    for (const order of orders) {
      const dateKey = order.paidAt?.toISOString().slice(0, 10) || "unknown";
      const existing = dailyMap.get(dateKey);
      if (existing) {
        existing.gross += order.total;
        existing.vat += order.vatTotal;
        existing.net += order.total - order.vatTotal;
        existing.count++;
      } else {
        dailyMap.set(dateKey, {
          date: dateKey,
          gross: order.total,
          vat: order.vatTotal,
          net: order.total - order.vatTotal,
          count: 1,
        });
      }
    }

    const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      period: {
        from: startDate.toISOString().slice(0, 10),
        to: endDate.toISOString().slice(0, 10),
      },
      tenant: {
        name: tenant.name,
        taxNumber: tenant.taxNumber,
        businessUnit: tenant.businessUnit,
        cashRegister: tenant.cashRegister,
      },
      sales: {
        vatBuckets: salesVat.map((b) => ({
          rate: b.rate,
          ratePercent: (b.rate * 100).toFixed(1) + "%",
          net: Math.round(b.net * 100) / 100,
          vat: Math.round(b.vat * 100) / 100,
          gross: Math.round(b.gross * 100) / 100,
          count: b.count,
        })),
        totalNet: Math.round(totalSalesNet * 100) / 100,
        totalVat: Math.round(totalSalesVat * 100) / 100,
        totalGross: Math.round(totalSalesGross * 100) / 100,
        totalTips: Math.round(totalTips * 100) / 100,
        orderCount: orders.length,
      },
      storno: {
        vatBuckets: stornoVat.map((b) => ({
          rate: b.rate,
          ratePercent: (b.rate * 100).toFixed(1) + "%",
          net: Math.round(b.net * 100) / 100,
          vat: Math.round(b.vat * 100) / 100,
          gross: Math.round(b.gross * 100) / 100,
          count: b.count,
        })),
        totalGross: Math.round(totalStornoGross * 100) / 100,
        totalVat: Math.round(totalStornoVat * 100) / 100,
        count: stornoOrders.length,
      },
      net: {
        totalGross: Math.round((totalSalesGross - totalStornoGross) * 100) / 100,
        totalVat: Math.round((totalSalesVat - totalStornoVat) * 100) / 100,
      },
      byPaymentMethod: Object.values(byPaymentMethod).map((m) => ({
        ...m,
        gross: Math.round(m.gross * 100) / 100,
        vat: Math.round(m.vat * 100) / 100,
      })),
      daily,
    });
  } catch (e) {
    console.error("GET /api/ddv-report error:", e);
    return NextResponse.json({ error: "Napaka pri generiranju DDV poročila" }, { status: 500 });
  }
}
