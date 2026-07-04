import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import {
  calculateZOI,
  generateEOR,
  buildInvoiceXml,
  buildInvoiceNumber,
  type InvoiceIssuer,
} from "@/lib/furs";
import { sendInvoiceToFurs } from "@/lib/furs-api";

export const dynamic = "force-dynamic";

// Stornira obstoječi plačani račun (FURS zahteva storno račun z referenco)
// Uporablja $transaction za atomičnost in sendInvoiceToFurs za pravo fiskalizacijo.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason: string = (body.reason || "Napaka blagajnika").slice(0, 200);

    // === Tenant resolution ===
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant ni najden" }, { status: 400 });
    }

    // === Tenant-scoped lookup (preprečuje IDOR) ===
    const original = await db.order.findFirst({
      where: { id, restaurantId: tenant.id },
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

    // === Tenant-based InvoiceIssuer ===
    const issuerTaxNumber = tenant.taxNumber.replace(/^SI/i, "");
    const issuer: InvoiceIssuer = {
      taxNumber: issuerTaxNumber,
      businessPremiseID: tenant.businessUnit,
      electronicDeviceID: tenant.cashRegister,
      name: tenant.name,
      address: tenant.address || undefined,
      city: tenant.city || undefined,
    };

    // Naslednja zaporedna številka (per-tenant)
    const paidCount = await db.order.count({
      where: { status: { in: ["paid", "storno"] }, restaurantId: tenant.id },
    });
    const invoiceSeq = paidCount + 1;
    const invoiceNumberStr = buildInvoiceNumber(
      invoiceSeq,
      issuer.businessPremiseID,
      issuer.electronicDeviceID
    );

    const issueDate = new Date();

    const zoi = calculateZOI({
      taxNumber: issuerTaxNumber,
      issueDate,
      invoiceNumber: invoiceSeq,
      businessPremiseID: issuer.businessPremiseID,
      electronicDeviceID: issuer.electronicDeviceID,
    });

    const fursXml = buildInvoiceXml(
      {
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
      },
      issuer
    );

    // Provisional EOR (POC fallback) — real EOR pride iz FURS-a
    let eor = generateEOR();
    let fursSubmitted = false;

    // === $transaction: ustvari storno + označi original + kopiraj postavke ===
    const storno = await db.$transaction(async (tx) => {
      const newStorno = await tx.order.create({
        data: {
          tableId: original.tableId,
          restaurantId: tenant.id,
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
      await tx.order.update({
        where: { id: original.id },
        data: {
          stornoOf: newStorno.id,
          stornoReason: reason,
          stornoAt: issueDate,
          stornoZoi: zoi,
          stornoEor: eor,
        },
      });

      // Kopiraj postavke v storno
      await tx.orderItem.createMany({
        data: original.items.map((it) => ({
          orderId: newStorno.id,
          menuItemId: it.menuItemId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          vatRate: it.vatRate,
          note: "STORNO",
        })),
      });

      return newStorno;
    });

    // === FURS fiskalizacija (OUTSIDE transaction — network I/O) ===
    try {
      const fursResult = await sendInvoiceToFurs({
        xml: fursXml,
        zoi,
        config: {
          taxNumber: issuerTaxNumber,
          businessPremiseID: issuer.businessPremiseID,
          electronicDeviceID: issuer.electronicDeviceID,
          fursEnv: tenant.fursEnv,
        },
      });

      if (fursResult.success && fursResult.eor) {
        eor = fursResult.eor;
        fursSubmitted = fursResult.error?.code !== "POC_MODE";
        // Posodobi storno z real EOR
        await db.order.update({
          where: { id: storno.id },
          data: { eor, fursSubmitted },
        });
      } else {
        console.warn("[storno] FURS POC mode:", fursResult.error?.message);
      }
    } catch (fursErr) {
      console.error("[storno] FURS submission failed (non-fatal):", fursErr);
    }

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
