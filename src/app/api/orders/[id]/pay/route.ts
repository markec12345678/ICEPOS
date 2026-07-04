import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import {
  calculateZOI,
  generateEOR,
  buildInvoiceXml,
  buildInvoiceNumber,
} from "@/lib/furs";
import { sendInvoiceToFurs } from "@/lib/furs-api";
import { writeAuditLog, getIpAddress } from "@/lib/audit";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Zaključi (plača) naročilo — fiskalizira preko FURS modula
// Podpira: cash, card, giftcard plačilo +customerId za loyalty točke
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const operator = await getOperatorFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const paymentMethod: "cash" | "card" | "giftcard" =
      body.paymentMethod === "card"
        ? "card"
        : body.paymentMethod === "giftcard"
        ? "giftcard"
        : "cash";
    const customerId: string | undefined = body.customerId;
    const giftCardCode: string | undefined = body.giftCardCode;
    const tip: number = typeof body.tip === "number" && body.tip > 0 ? body.tip : 0;

    const order = await db.order.findFirst({
      where: { id, restaurantId: tenant.id },
      include: { items: { include: { menuItem: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: "Naročilo ni najdeno" }, { status: 404 });
    }
    if (order.status !== "open") {
      return NextResponse.json({ error: "Naročilo je že zaključeno" }, { status: 400 });
    }

    // Gift card validacija (znotraj te restavracije)
    let giftCardId: string | null = null;
    if (paymentMethod === "giftcard") {
      if (!giftCardCode) {
        return NextResponse.json({ error: "Manjka koda darilne kartice" }, { status: 400 });
      }
      const gc = await db.giftCard.findFirst({
        where: { code: giftCardCode.toUpperCase(), restaurantId: tenant.id },
      });
      if (!gc) {
        return NextResponse.json({ error: "Darilna kartica ni najdena" }, { status: 404 });
      }
      if (gc.status !== "active") {
        return NextResponse.json({ error: "Kartica ni aktivna" }, { status: 400 });
      }
      if (Number(gc.balance) < Number(order.total)) {
        return NextResponse.json(
          { error: `Premajhno stanje (${gc.balance.toFixed(2)} €) za ${order.total.toFixed(2)} €` },
          { status: 400 }
        );
      }
      giftCardId = gc.id;
    }

    // Določi naslednjo zaporedno številko računa (per restavracija)
    const paidCount = await db.order.count({
      where: { status: { in: ["paid", "storno"] }, restaurantId: tenant.id },
    });
    const invoiceSeq = paidCount + 1;
    const invoiceNumberStr = buildInvoiceNumber(invoiceSeq);
    const issueDate = new Date();

    // ZOI (uporabi tenant podatke za FURS)
    const zoi = calculateZOI({
      taxNumber: tenant.taxNumber,
      issueDate,
      invoiceNumber: invoiceSeq,
      businessPremiseID: tenant.businessUnit,
      electronicDeviceID: tenant.cashRegister,
    });

    // XML račun
    const fursXml = buildInvoiceXml({
      invoiceNumber: invoiceSeq,
      issueDateTime: issueDate,
      zoi,
      items: order.items.map((it) => ({
        name: it.menuItem.name,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        vatRate: it.vatRate,
      })),
      paymentMethod: paymentMethod === "giftcard" ? "card" : paymentMethod,
      operator: order.operator,
    });

    // Pošlji na FURS za pravi EOR (če je certifikat naložen, sicer POC)
    const restaurant = await db.restaurant.findUnique({
      where: { id: tenant.id },
      select: { fursEnv: true, fursCertPath: true, fursCertPassword: true, taxNumber: true },
    });

    let eor: string;
    let fursSuccess = true;
    if (restaurant) {
      const fursResult = await sendInvoiceToFurs({
        xml: fursXml,
        zoi,
        config: {
          env: restaurant.fursEnv as "test" | "prod",
          certPath: restaurant.fursCertPath || undefined,
          certPassword: restaurant.fursCertPassword || undefined,
          taxNumber: restaurant.taxNumber,
        },
      });
      eor = fursResult.eor;
      fursSuccess = fursResult.success;
      if (!fursResult.success) {
        console.warn(`[pay] FURS POC mode: ${fursResult.error?.message}`);
      }
      
      // Audit log — FURS fiskalizacija
      await writeAuditLog({
        restaurantId: tenant.id,
        operatorName: operator?.name,
        ipAddress: getIpAddress(req),
        action: "furs_fiscalize",
        entityType: "order",
        entityId: id,
        description: `Fiskalizacija računa ${invoiceNumberStr} (ZOI: ${zoi.slice(0, 8)}...)`,
        newValue: { zoi, eor, fursSubmitted: fursSuccess, paymentMethod },
        success: fursSuccess,
        errorMessage: fursSuccess ? undefined : fursResult.error?.message,
      });
    } else {
      eor = generateEOR();
    }

    // === ATOMIC $transaction: order update + inventory + gift card + loyalty ===
    // Vse pisanje je atomično. Če inventory deduction vrže napako (negativna zaloga),
    // se celotna transakcija rollback-a — order NE bo označen kot paid.
    // FURS mrežni klic je IZVEN transakcije (network I/O ne sme držati DB tx odprte).
    const paid = await db.$transaction(async (tx) => {
      const updated = await tx.order.update({
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
          tip,
        },
        include: {
          table: true,
          items: { include: { menuItem: true } },
        },
      });

      // Inventory deduction — THROW na negativno zalogo → rollback
      for (const it of order.items) {
        const recipes = await tx.recipe.findMany({
          where: { menuItemId: it.menuItemId },
        });
        for (const recipe of recipes) {
          const deductQty = recipe.quantity * it.quantity;
          const inv = await tx.inventoryItem.update({
            where: { id: recipe.inventoryItemId },
            data: { quantity: { decrement: deductQty } },
          });
          if (inv.quantity < 0) {
            throw new Error(`Zaloga "${inv.name}" bi šla v negativno (${inv.quantity})`);
          }
        }
      }

      // Gift card redeem — THROW na premajhno stanje → rollback
      if (giftCardId) {
        const gc = await tx.giftCard.findUnique({ where: { id: giftCardId } });
        if (gc) {
          if (Number(gc.balance) < Number(order.total)) {
            throw new Error("Darilna kartica nima dovolj sredstev");
          }
          const newBalance = Number(gc.balance) - Number(order.total);
          await tx.giftCard.update({
            where: { id: giftCardId },
            data: {
              balance: newBalance,
              status: newBalance <= 0 ? "used" : "active",
            },
          });
        }
      }

      // Loyalty točke
      if (customerId) {
        const pointsToAdd = Math.floor(Number(order.total) / 10);
        await tx.customer.update({
          where: { id: customerId },
          data: {
            points: { increment: pointsToAdd },
            totalSpent: { increment: order.total },
            visitCount: { increment: 1 },
          },
        });
      }

      return updated;
    });

    return NextResponse.json({
      ...paid,
      tip,
      grandTotal: Number(paid.total) + Number(tip),
      fursXmlPreview: fursXml.slice(0, 800) + "...(skrajšano)",
    });
  } catch (e) {
    console.error("POST /api/orders/[id]/pay error:", e);
    return NextResponse.json({ error: "Napaka pri zaključevanju računa" }, { status: 500 });
  }
}
