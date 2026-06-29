import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  calculateZOI,
  generateEOR,
  buildInvoiceXml,
  buildInvoiceNumber,
  ISSUER,
} from "@/lib/furs";

export const dynamic = "force-dynamic";

// Zaključi (plača) naročilo — fiskalizira preko FURS modula
// Podpira: cash, card, giftcard plačilo +customerId za loyalty točke
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const paymentMethod: "cash" | "card" | "giftcard" =
      body.paymentMethod === "card"
        ? "card"
        : body.paymentMethod === "giftcard"
        ? "giftcard"
        : "cash";
    const customerId: string | undefined = body.customerId;
    const giftCardCode: string | undefined = body.giftCardCode;

    const order = await db.order.findUnique({
      where: { id },
      include: { items: { include: { menuItem: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: "Naročilo ni najdeno" }, { status: 404 });
    }
    if (order.status !== "open") {
      return NextResponse.json({ error: "Naročilo je že zaključeno" }, { status: 400 });
    }

    // Gift card validacija
    let giftCardId: string | null = null;
    if (paymentMethod === "giftcard") {
      if (!giftCardCode) {
        return NextResponse.json({ error: "Manjka koda darilne kartice" }, { status: 400 });
      }
      const gc = await db.giftCard.findFirst({
        where: { code: giftCardCode.toUpperCase() },
      });
      if (!gc) {
        return NextResponse.json({ error: "Darilna kartica ni najdena" }, { status: 404 });
      }
      if (gc.status !== "active") {
        return NextResponse.json({ error: "Kartica ni aktivna" }, { status: 400 });
      }
      if (gc.balance < order.total) {
        return NextResponse.json(
          { error: `Premajhno stanje (${gc.balance.toFixed(2)} €) za ${order.total.toFixed(2)} €` },
          { status: 400 }
        );
      }
      giftCardId = gc.id;
    }

    // Določi naslednjo zaporedno številko računa
    const paidCount = await db.order.count({
      where: { status: { in: ["paid", "storno"] } },
    });
    const invoiceSeq = paidCount + 1;
    const invoiceNumberStr = buildInvoiceNumber(invoiceSeq);
    const issueDate = new Date();

    // ZOI
    const zoi = calculateZOI({
      taxNumber: ISSUER.taxNumber,
      issueDate,
      invoiceNumber: invoiceSeq,
      businessPremiseID: ISSUER.businessPremiseID,
      electronicDeviceID: ISSUER.electronicDeviceID,
    });
    const eor = generateEOR();

    // XML račun
    const fursXml = buildInvoiceXml({
      invoiceNumber: invoiceSeq,
      issueDateTime: issueDate,
      zoi,
      items: order.items.map((it) => ({
        name: it.menuItem.name,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        vatRate: it.vatRate,
      })),
      paymentMethod: paymentMethod === "giftcard" ? "card" : paymentMethod,
      operator: order.operator,
    });

    // Posodobi naročilo
    const paid = await db.order.update({
      where: { id },
      data: {
        status: "paid",
        paymentMethod: paymentMethod === "giftcard" ? "card" : paymentMethod,
        paidAt: issueDate,
        receiptNo: invoiceNumberStr,
        invoiceNumber: invoiceNumberStr,
        zoi,
        eor,
        fursXml,
        customerId: customerId || null,
      },
      include: {
        table: true,
        items: { include: { menuItem: true } },
      },
    });

    // === POST-PLAČILO: Inventory dedukcija (ne-blokirajoče) ===
    try {
      for (const it of order.items) {
        const recipes = await db.recipe.findMany({
          where: { menuItemId: it.menuItemId },
        });
        for (const recipe of recipes) {
          const deductQty = recipe.quantity * it.quantity;
          await db.inventoryItem.update({
            where: { id: recipe.inventoryItemId },
            data: { quantity: { decrement: deductQty } },
          });
        }
      }
    } catch (invErr) {
      console.error("[pay] Inventory deduction failed (non-blocking):", invErr);
    }

    // === POST-PLAČILO: Gift card redeem ===
    if (giftCardId) {
      try {
        const gc = await db.giftCard.findUnique({ where: { id: giftCardId } });
        if (gc) {
          const newBalance = gc.balance - order.total;
          await db.giftCard.update({
            where: { id: giftCardId },
            data: {
              balance: newBalance,
              status: newBalance <= 0 ? "used" : "active",
            },
          });
        }
      } catch (gcErr) {
        console.error("[pay] Gift card redeem failed (non-blocking):", gcErr);
      }
    }

    // === POST-PLAČILO: Loyalty točke ===
    if (customerId) {
      try {
        const customer = await db.customer.findUnique({ where: { id: customerId } });
        if (customer) {
          const pointsToAdd = Math.floor(order.total / 10);
          await db.customer.update({
            where: { id: customerId },
            data: {
              points: { increment: pointsToAdd },
              totalSpent: { increment: order.total },
              visitCount: { increment: 1 },
            },
          });
        }
      } catch (custErr) {
        console.error("[pay] Loyalty points failed (non-blocking):", custErr);
      }
    }

    return NextResponse.json({
      ...paid,
      fursXmlPreview: fursXml.slice(0, 800) + "...(skrajšano)",
    });
  } catch (e) {
    console.error("POST /api/orders/[id]/pay error:", e);
    return NextResponse.json({ error: "Napaka pri zaključevanju računa" }, { status: 500 });
  }
}
