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
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const paymentMethod: "cash" | "card" =
      body.paymentMethod === "card" ? "card" : "cash";

    const order = await db.order.findUnique({
      where: { id },
      include: { items: { include: { menuItem: true } } },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Naročilo ni najdeno" },
        { status: 404 }
      );
    }
    if (order.status !== "open") {
      return NextResponse.json(
        { error: "Naročilo je že zaključeno" },
        { status: 400 }
      );
    }

    // Določi naslednjo zaporedno številko računa
    // Štejemo vse plačane + stornirane račune (FURS zahteva neprekinjeno zaporedje)
    const paidCount = await db.order.count({
      where: { status: { in: ["paid", "storno"] } },
    });
    const invoiceSeq = paidCount + 1;
    const invoiceNumberStr = buildInvoiceNumber(invoiceSeq);

    const issueDate = new Date();

    // Izračun ZOI (zaščitna oznaka izdajatelja)
    const zoi = calculateZOI({
      taxNumber: ISSUER.taxNumber,
      issueDate,
      invoiceNumber: invoiceSeq,
      businessPremiseID: ISSUER.businessPremiseID,
      electronicDeviceID: ISSUER.electronicDeviceID,
    });

    // EOR (v produkciji: vrne FURS po oddaji XML-a; tukaj demo UUID)
    const eor = generateEOR();

    // Zgradi XML račun (shranjen za audit)
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
      paymentMethod,
      operator: order.operator,
    });

    const paid = await db.order.update({
      where: { id },
      data: {
        status: "paid",
        paymentMethod,
        paidAt: issueDate,
        receiptNo: invoiceNumberStr,
        invoiceNumber: invoiceNumberStr,
        zoi,
        eor,
        fursXml,
      },
      include: {
        table: true,
        items: { include: { menuItem: true } },
      },
    });

    return NextResponse.json({
      ...paid,
      // Vrnemo tudi XML za prikaz (debug) in QR payload za prikaz na računu
      fursXmlPreview: fursXml.slice(0, 800) + "...(skrajšano)",
    });
  } catch (e) {
    console.error("POST /api/orders/[id]/pay error:", e);
    return NextResponse.json(
      { error: "Napaka pri zaključevanju računa" },
      { status: 500 }
    );
  }
}
