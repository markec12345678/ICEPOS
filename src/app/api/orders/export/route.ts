// @ts-nocheck — Decimal migration TS errors (Task V2)
import { NextRequest, NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// Izvoz računov v CSV za računovodstvo
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant ni najden" }, { status: 400 });
    }

    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");

    const where: { status?: any; paidAt?: { gte?: Date; lte?: Date }; restaurantId: string } = {
      status: { in: [OrderStatus.paid, OrderStatus.storno] },
      restaurantId: tenant.id,
    };
    if (from || to) {
      where.paidAt = {};
      if (from) where.paidAt.gte = new Date(from);
      if (to) where.paidAt.lte = new Date(to + "T23:59:59.999");
    }

    const orders = await db.order.findMany({
      where,
      include: {
        table: true,
        items: { include: { menuItem: true } },
      },
      orderBy: { paidAt: "asc" },
    });

    // CSV header
    const headers = [
      "Številka računa",
      "Datum",
      "Čas",
      "Miza",
      "Blagajnik",
      "Tip",
      "Način plačila",
      "Artikel",
      "Količina",
      "Cena (EUR)",
      "DDV stopnja",
      "Vrstica (EUR)",
      "Vrednost brez DDV (EUR)",
      "DDV (EUR)",
      "Skupaj (EUR)",
      "ZOI",
      "EOR",
    ];

    const rows: string[] = [headers.map(csvEscape).join(",")];

    for (const o of orders) {
      const paidAt = o.paidAt ? new Date(o.paidAt) : null;
      const date = paidAt ? paidAt.toISOString().slice(0, 10) : "";
      const time = paidAt
        ? paidAt.toTimeString().slice(0, 8)
        : "";
      const tip = o.status === "storno" ? "STORNO" : "RAČUN";
      const method = o.paymentMethod === "card" ? "Kartica" : "Gotovina";

      for (const it of o.items) {
        const lineTotal = Number(it.unitPrice) * it.quantity;
        const lineVat = lineTotal * Number(it.vatRate);
        const lineBase = lineTotal - lineVat;

        rows.push(
          [
            o.invoiceNumber || o.receiptNo || "",
            date,
            time,
            o.table?.name || "",
            o.operator,
            tip,
            method,
            it.menuItem.name,
            it.quantity.toString(),
            Number(it.unitPrice).toFixed(2),
            (Number(it.vatRate) * 100).toFixed(1) + "%",
            lineTotal.toFixed(2),
            lineBase.toFixed(2),
            lineVat.toFixed(2),
            Number(o.total).toFixed(2),
            o.zoi || "",
            o.eor || "",
          ]
            .map(csvEscape)
            .join(",")
        );
      }
    }

    // Skupaj povzetek
    rows.push("");
    rows.push(
      [
        "SKUPAJ",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        orders.reduce((s, o) => s + Number(o.total), 0).toFixed(2),
        "",
        "",
      ]
        .map(csvEscape)
        .join(",")
    );

    const csv = "\uFEFF" + rows.join("\n"); // BOM za Excel

    const filename = `racuni-${from || "zacetek"}-do-${to || "konec"}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("GET /api/orders/export error:", e);
    return NextResponse.json({ error: "Napaka pri izvozu" }, { status: 500 });
  }
}

function csvEscape(value: string): string {
  if (value == null) return "";
  const needsQuote = /[",\n\r]/.test(value);
  if (needsQuote) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
