import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Z-report (dnevni zaključek) — povzetek vseh računov za določen dan
// FURS zahteva dnevni zaključek blagajne na koncu delovnega dne
export async function GET(req: NextRequest) {
  try {
    const dateParam = req.nextUrl.searchParams.get("date");
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const paidOrders = await db.order.findMany({
      where: {
        status: { in: ["paid", "storno"] },
        paidAt: { gte: startOfDay, lte: endOfDay },
      },
      include: { items: { include: { menuItem: true } } },
      orderBy: { paidAt: "asc" },
    });

    const validReceipts = paidOrders.filter((o) => o.status === "paid");
    const stornoReceipts = paidOrders.filter((o) => o.status === "storno");

    const grossTotal = validReceipts.reduce((s, o) => s + Number(o.total), 0);
    const totalTips = validReceipts.reduce((s, o) => s + Number(o.tip || 0), 0);
    const stornoTotal = stornoReceipts.reduce(
      (s, o) => s + Math.abs(Number(o.total)),
      0
    );
    const netTotal = grossTotal - stornoTotal;

    // DDV po stopnjah (veljavni - storno)
    const vatBuckets = new Map<
      number,
      { base: number; vat: number; gross: number }
    >();
    const applyItem = (
      it: { unitPrice: number; quantity: number; vatRate: number },
      sign: number
    ) => {
      const lineGross = Number(it.unitPrice) * it.quantity * sign;
      const lineVat = lineGross * it.vatRate;
      const lineBase = lineGross - lineVat;
      const existing = vatBuckets.get(it.vatRate);
      if (existing) {
        existing.base += lineBase;
        existing.vat += lineVat;
        existing.gross += lineGross;
      } else {
        vatBuckets.set(it.vatRate, {
          base: lineBase,
          vat: lineVat,
          gross: lineGross,
        });
      }
    };
    for (const o of validReceipts) {
      for (const it of o.items) applyItem(it, 1);
    }
    for (const o of stornoReceipts) {
      for (const it of o.items) applyItem(it, 1); // storno items so že z negativnim znakom v total
    }

    const vatBreakdown = Array.from(vatBuckets.entries())
      .map(([rate, v]) => ({
        rate,
        ratePercent: (rate * 100).toFixed(1),
        base: Math.round(v.base * 100) / 100,
        vat: Math.round(v.vat * 100) / 100,
        gross: Math.round(v.gross * 100) / 100,
      }))
      .sort((a, b) => b.rate - a.rate);

    const netVatTotal = vatBreakdown.reduce((s, v) => s + v.vat, 0);

    // Po načinu plačila (samo veljavni)
    const paymentMap = new Map<string, { count: number; total: number }>();
    for (const o of validReceipts) {
      const method = o.paymentMethod || "cash";
      const existing = paymentMap.get(method);
      if (existing) {
        existing.count += 1;
        existing.total += Number(o.total);
      } else {
        paymentMap.set(method, { count: 1, total: Number(o.total) });
      }
    }
    const paymentBreakdown = Array.from(paymentMap.entries()).map(
      ([method, v]) => ({
        method,
        count: v.count,
        total: Math.round(Number(v.total) * 100) / 100,
      })
    );

    // Zaporedna številka Z-reporta (štejemo dni s plačanimi računi)
    const allPaid = await db.order.findMany({
      where: { status: { in: ["paid", "storno"] } },
      select: { paidAt: true },
    });
    const uniqueDays = new Set(
      allPaid
        .filter((o) => o.paidAt)
        .map((o) => o.paidAt!.toISOString().slice(0, 10))
    );

    return NextResponse.json({
      date: startOfDay.toISOString().slice(0, 10),
      zReportNumber: uniqueDays.size,
      generatedAt: new Date().toISOString(),
      businessUnit: "PREVOZ11",
      cashRegister: "BLAG01",
      operator: "Ana",
      summary: {
        grossTotal: Math.round(grossTotal * 100) / 100,
        stornoTotal: Math.round(stornoTotal * 100) / 100,
        netTotal: Math.round(netTotal * 100) / 100,
        totalTips: Math.round(totalTips * 100) / 100,
        netVatTotal: Math.round(netVatTotal * 100) / 100,
        receiptCount: validReceipts.length,
        stornoCount: stornoReceipts.length,
        firstReceiptAt: validReceipts[0]?.paidAt || null,
        lastReceiptAt:
          validReceipts[validReceipts.length - 1]?.paidAt || null,
      },
      vatBreakdown,
      paymentBreakdown,
      receipts: paidOrders.map((o) => ({
        id: o.id,
        invoiceNumber: o.invoiceNumber,
        type: o.status === "storno" ? "STORNO" : "INVOICE",
        time: o.paidAt,
        total: o.total,
        paymentMethod: o.paymentMethod,
        zoi: o.zoi,
        eor: o.eor,
      })),
    });
  } catch (e) {
    console.error("GET /api/z-report error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
