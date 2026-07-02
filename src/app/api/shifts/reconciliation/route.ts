import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// Denominacije EUR bankovcev in kovancev za štetje
const DENOMINATIONS = [
  { value: 500, label: "500€", type: "banknote" },
  { value: 200, label: "200€", type: "banknote" },
  { value: 100, label: "100€", type: "banknote" },
  { value: 50, label: "50€", type: "banknote" },
  { value: 20, label: "20€", type: "banknote" },
  { value: 10, label: "10€", type: "banknote" },
  { value: 5, label: "5€", type: "banknote" },
  { value: 2, label: "2€", type: "coin" },
  { value: 1, label: "1€", type: "coin" },
  { value: 0.5, label: "50c", type: "coin" },
  { value: 0.2, label: "20c", type: "coin" },
  { value: 0.1, label: "10c", type: "coin" },
  { value: 0.05, label: "5c", type: "coin" },
  { value: 0.02, label: "2c", type: "coin" },
  { value: 0.01, label: "1c", type: "coin" },
];

// GET /api/shifts/reconciliation?shiftId=xxx — podatki za uskladitev blagajne
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const shiftId = req.nextUrl.searchParams.get("shiftId");

    let shift = null;
    if (shiftId) {
      shift = await db.shift.findFirst({
        where: { id: shiftId, restaurantId: tenant.id },
      });
    } else {
      // Aktivna smena
      shift = await db.shift.findFirst({
        where: { restaurantId: tenant.id, status: "open" },
        orderBy: { startTime: "desc" },
      });
    }

    if (!shift) {
      return NextResponse.json({ error: "Smena ni najdena" }, { status: 404 });
    }

    // Pridobi vse plačane račune v smeni
    const paidOrders = await db.order.findMany({
      where: {
        restaurantId: tenant.id,
        status: "paid",
        paidAt: {
          gte: shift.startTime,
          lte: shift.endTime || new Date(),
        },
      },
      select: {
        total: true,
        tip: true,
        paymentMethod: true,
        paidAt: true,
      },
    });

    // Izračunaj pričakovan stanje blagajne
    const cashOrders = paidOrders.filter((o) => o.paymentMethod === "cash");
    const cardOrders = paidOrders.filter((o) => o.paymentMethod === "card");
    const giftcardOrders = paidOrders.filter((o) => o.paymentMethod === "giftcard");

    const cashRevenue = cashOrders.reduce((s, o) => s + o.total, 0);
    const cardRevenue = cardOrders.reduce((s, o) => s + o.total, 0);
    const giftcardRevenue = giftcardOrders.reduce((s, o) => s + o.total, 0);
    const totalTips = paidOrders.reduce((s, o) => s + (o.tip || 0), 0);

    // Pričakovan stanje blagajne = začetno stanje + gotovinski promet + napitnine
    const expectedCash = shift.startCash + cashRevenue + totalTips;

    return NextResponse.json({
      shift: {
        id: shift.id,
        operator: shift.operator,
        startTime: shift.startTime,
        endTime: shift.endTime,
        startCash: shift.startCash,
        endCash: shift.endCash,
        status: shift.status,
      },
      denominations: DENOMINATIONS,
      summary: {
        cashRevenue: Math.round(cashRevenue * 100) / 100,
        cardRevenue: Math.round(cardRevenue * 100) / 100,
        giftcardRevenue: Math.round(giftcardRevenue * 100) / 100,
        totalRevenue: Math.round((cashRevenue + cardRevenue + giftcardRevenue) * 100) / 100,
        totalTips: Math.round(totalTips * 100) / 100,
        cashOrderCount: cashOrders.length,
        cardOrderCount: cardOrders.length,
        giftcardOrderCount: giftcardOrders.length,
        totalOrders: paidOrders.length,
        startCash: shift.startCash,
        expectedCash: Math.round(expectedCash * 100) / 100,
      },
    });
  } catch (e) {
    console.error("GET /api/shifts/reconciliation error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
