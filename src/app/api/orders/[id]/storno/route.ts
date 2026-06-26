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

// Stornira obstoječi plačani račun (FURS zahteva storno račun z referenco)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason: string = (body.reason || "Napaka blagajnika").slice(0, 200);

    const original = await db.order.findUnique({
      where: { id },
      include: { items: { include: { menuItem: true } }, table: true },
    });

    if (!original) {
      return NextResponse.json({ error: "Račun ni najden" }, { status: 404 });
    }
    if (original.status !== "paid") {
      return NextResponse.json(
        { error: "Stornirati se da le plačan račun" },
        { status: 400 }
      );
    }

    // Naslednja zaporedna številka
    const paidCount = await db.order.count({
      where: { status: { in: ["paid", "storno"] } },
    });
    const invoiceSeq = paidCount + 1;
    const invoiceNumberStr = buildInvoiceNumber(invoiceSeq);

    const issueDate = new Date();

    const zoi = calculateZOI({
      taxNumber: ISSUER.taxNumber,
      issueDate,
      invoiceNumber: invoiceSeq,
      businessPremiseID: ISSUER.businessPremiseID,
      electronicDeviceID: ISSUER.electronicDeviceID,
    });
    const eor = generateEOR();

    const fursXml = buildInvoiceXml({
      invoiceNumber: invoiceSeq,
      issueDateTime: issueDate,
      zoi,
      items: original.items.map((it) => ({
        name: it.menuItem.name,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        vatRate: it.vatRate,
      })),
      paymentMethod:
        (original.paymentMethod as "cash" | "card") || "cash",
      operator: original.operator,
      referenceInvoice: {
        number: original.invoiceNumber || original.receiptNo || "",
        zoi: original.zoi || "",
      },
    });

    // Ustvari storno račun (z negativnimi vrednostmi)
    const storno = await db.order.create({
      data: {
        tableId: original.tableId,
        status: "storno",
        total: -original.total,
        vatTotal: -original.vatTotal,
        paidAt: issueDate,
        paymentMethod: original.paymentMethod,
        receiptNo: invoiceNumberStr,
        invoiceNumber: invoiceNumberStr,
        zoi,
        eor,
        fursXml,
        operator: original.operator,
        operatorTaxNo: original.operatorTaxNo,
        businessUnit: original.businessUnit,
        cashRegister: original.cashRegister,
        stornoOf: original.id,
        stornoReason: reason,
        stornoAt: issueDate,
        stornoZoi: zoi,
        stornoEor: eor,
      },
    });

    // Označi original kot storniran
    await db.order.update({
      where: { id: original.id },
      data: {
        stornoOf: storno.id,
        stornoReason: reason,
        stornoAt: issueDate,
        stornoZoi: zoi,
        stornoEor: eor,
      },
    });

    // Kopiraj postavke v storno
    await db.orderItem.createMany({
      data: original.items.map((it) => ({
        orderId: storno.id,
        menuItemId: it.menuItemId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        vatRate: it.vatRate,
        note: "STORNO",
      })),
    });

    const fullStorno = await db.order.findUnique({
      where: { id: storno.id },
      include: { table: true, items: { include: { menuItem: true } } },
    });

    return NextResponse.json({
      storno: fullStorno,
      original: {
        id: original.id,
        invoiceNumber: original.invoiceNumber,
        zoi: original.zoi,
        eor: original.eor,
      },
    });
  } catch (e) {
    console.error("POST /api/orders/[id]/storno error:", e);
    return NextResponse.json(
      { error: "Napaka pri storniranju računa" },
      { status: 500 }
    );
  }
}
