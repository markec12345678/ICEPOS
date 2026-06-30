import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/accounting/export?from=2024-01-01&to=2024-12-31&format=pantheon|quickbooks|csv|xml
// Izvozi račune v formatu za računovodski program
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const from = req.nextUrl.searchParams.get("from") || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const to = req.nextUrl.searchParams.get("to") || new Date().toISOString().slice(0, 10);
    const format = req.nextUrl.searchParams.get("format") || "csv";

    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    // Pridobi vse plačane račune v obdobju
    const orders = await db.order.findMany({
      where: {
        status: { in: ["paid", "storno"] },
        restaurantId: tenant.id,
        paidAt: { gte: fromDate, lte: toDate },
      },
      include: {
        items: { include: { menuItem: true } },
        customer: true,
      },
      orderBy: { paidAt: "asc" },
    });

    if (orders.length === 0) {
      return NextResponse.json({
        error: "Ni računov v izbranem obdobju",
        from,
        to,
        count: 0,
      });
    }

    // Restaurant podatki
    const restaurant = await db.restaurant.findUnique({
      where: { id: tenant.id },
      select: { name: true, taxNumber: true, address: true, city: true, businessUnit: true, cashRegister: true },
    });

    // Generiraj v izbranem formatu
    let content: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case "pantheon":
        content = generatePantheonCSV(orders, restaurant);
        contentType = "text/csv; charset=utf-8";
        filename = `pantheon_${from}_${to}.csv`;
        break;
      case "quickbooks":
        content = generateQuickBooksCSV(orders, restaurant);
        contentType = "text/csv; charset=utf-8";
        filename = `quickbooks_${from}_${to}.csv`;
        break;
      case "xml":
        content = generateXML(orders, restaurant, from, to);
        contentType = "application/xml; charset=utf-8";
        filename = `racuni_${from}_${to}.xml`;
        break;
      case "csv":
      default:
        content = generateGenericCSV(orders, restaurant);
        contentType = "text/csv; charset=utf-8";
        filename = `racuni_${from}_${to}.csv`;
        break;
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("GET /api/accounting/export error:", e);
    return NextResponse.json({ error: "Napaka pri exportu" }, { status: 500 });
  }
}

// ============================================================
// Format: Pantheon (slovensko računovodstvo)
// ============================================================
// CSV z glavo: Datum, Številka, Stranka, Znesek, DDV, Neto, Način plačila, ZOI, EOR
function generatePantheonCSV(orders: any[], restaurant: any): string {
  const rows: string[] = [];
  rows.push("Datum;Številka računa;Stranka;Bruto znesek;DDV znesek;Neto znesek;Način plačila;ZOI;EOR;Status");

  for (const o of orders) {
    const date = o.paidAt ? new Date(o.paidAt).toLocaleDateString("sl-SI") : "";
    const invoiceNo = o.invoiceNumber || o.receiptNo || "";
    const customer = o.customer?.name || "Gost";
    const total = o.total.toFixed(2).replace(".", ",");
    const vat = o.vatTotal.toFixed(2).replace(".", ",");
    const net = (o.total - o.vatTotal).toFixed(2).replace(".", ",");
    const method = o.paymentMethod === "cash" ? "Gotovina" : o.paymentMethod === "card" ? "Kartica" : "Drugo";
    const zoi = o.zoi || "";
    const eor = o.eor || "";
    const status = o.status === "storno" ? "STORNO" : "OK";

    rows.push([date, invoiceNo, customer, total, vat, net, method, zoi, eor, status].join(";"));
  }

  // Dodaj še povzetek na koncu
  const totalRevenue = orders.reduce((s, o) => s + (o.status === "storno" ? -o.total : o.total), 0);
  const totalVat = orders.reduce((s, o) => s + (o.status === "storno" ? -o.vatTotal : o.vatTotal), 0);
  rows.push("");
  rows.push(`SKUPAJ;;;${totalRevenue.toFixed(2).replace(".", ",")};${totalVat.toFixed(2).replace(".", ",")};${(totalRevenue - totalVat).toFixed(2).replace(".", ",")};;;`);

  return rows.join("\n");
}

// ============================================================
// Format: QuickBooks (mednarodno)
// ============================================================
// CSV z glavo: Date, Invoice No, Customer, Amount, Tax, Net, Payment Method
function generateQuickBooksCSV(orders: any[], restaurant: any): string {
  const rows: string[] = [];
  rows.push("Date,Invoice No,Customer,Amount,Tax,Net,Payment Method,Status");

  for (const o of orders) {
    const date = o.paidAt ? new Date(o.paidAt).toISOString().slice(0, 10) : "";
    const invoiceNo = o.invoiceNumber || o.receiptNo || "";
    const customer = (o.customer?.name || "Guest").replace(/,/g, ";");
    const total = o.total.toFixed(2);
    const vat = o.vatTotal.toFixed(2);
    const net = (o.total - o.vatTotal).toFixed(2);
    const method = o.paymentMethod || "cash";
    const status = o.status === "storno" ? "STORNO" : "PAID";

    rows.push([date, invoiceNo, customer, total, vat, net, method, status].join(","));
  }

  return rows.join("\n");
}

// ============================================================
// Format: Generični CSV (podpira Excel)
// ============================================================
function generateGenericCSV(orders: any[], restaurant: any): string {
  const rows: string[] = [];
  // BOM za pravilen UTF-8 v Excelu
  rows.push("\uFEFFDatum,Številka računa,Stranka,Bruto znesek,DDV znesek,Neto znesek,Način plačila,ZOI,EOR,Status,Operater");

  for (const o of orders) {
    const date = o.paidAt ? new Date(o.paidAt).toLocaleString("sl-SI") : "";
    const invoiceNo = o.invoiceNumber || o.receiptNo || "";
    const customer = (o.customer?.name || "Gost").replace(/,/g, ";");
    const total = o.total.toFixed(2);
    const vat = o.vatTotal.toFixed(2);
    const net = (o.total - o.vatTotal).toFixed(2);
    const method = o.paymentMethod === "cash" ? "Gotovina" : o.paymentMethod === "card" ? "Kartica" : "Drugo";
    const zoi = o.zoi || "";
    const eor = o.eor || "";
    const status = o.status === "storno" ? "STORNO" : "OK";
    const operator = o.operator || "";

    rows.push([date, invoiceNo, customer, total, vat, net, method, zoi, eor, status, operator].join(","));
  }

  // Povzetek
  const totalRevenue = orders.reduce((s, o) => s + (o.status === "storno" ? -o.total : o.total), 0);
  const totalVat = orders.reduce((s, o) => s + (o.status === "storno" ? -o.vatTotal : o.vatTotal), 0);
  rows.push("");
  rows.push(`SKUPAJ,,,,${totalRevenue.toFixed(2)},${totalVat.toFixed(2)},${(totalRevenue - totalVat).toFixed(2)},,,,`);

  return rows.join("\n");
}

// ============================================================
// Format: XML (za slovenske eDavke)
// ============================================================
function generateXML(orders: any[], restaurant: any, from: string, to: string): string {
  const totalRevenue = orders.reduce((s, o) => s + (o.status === "storno" ? -o.total : o.total), 0);
  const totalVat = orders.reduce((s, o) => s + (o.status === "storno" ? -o.vatTotal : o.vatTotal), 0);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<RacunovodskiExport xmlns="http://edavki.durs.gov.si/">\n`;
  xml += `  <Obdobje od="${from}" do="${to}"/>\n`;
  xml += `  <Izdajatelj>\n`;
  xml += `    <Naziv>${escapeXml(restaurant?.name || "")}</Naziv>\n`;
  xml += `    <DavcnaStevilka>${escapeXml(restaurant?.taxNumber || "")}</DavcnaStevilka>\n`;
  xml += `    <PoslovniProstor>${escapeXml(restaurant?.businessUnit || "")}</PoslovniProstor>\n`;
  xml += `    <Naslov>${escapeXml(restaurant?.address || "")}</Naslov>\n`;
  xml += `  </Izdajatelj>\n`;
  xml += `  <Povzetek>\n`;
  xml += `    <SteviloRacunov>${orders.length}</SteviloRacunov>\n`;
  xml += `    <SkupniPromet>${totalRevenue.toFixed(2)}</SkupniPromet>\n`;
  xml += `    <SkupniDDV>${totalVat.toFixed(2)}</SkupniDDV>\n`;
  xml += `  </Povzetek>\n`;
  xml += `  <Racuni>\n`;

  for (const o of orders) {
    const date = o.paidAt ? new Date(o.paidAt).toISOString() : "";
    xml += `    <Racun>\n`;
    xml += `      <Stevilka>${escapeXml(o.invoiceNumber || o.receiptNo || "")}</Stevilka>\n`;
    xml += `      <Datum>${date}</Datum>\n`;
    xml += `      <Stranka>${escapeXml(o.customer?.name || "Gost")}</Stranka>\n`;
    xml += `      <BrutoZnesek>${o.total.toFixed(2)}</BrutoZnesek>\n`;
    xml += `      <DDVZnesek>${o.vatTotal.toFixed(2)}</DDVZnesek>\n`;
    xml += `      <NetoZnesek>${(o.total - o.vatTotal).toFixed(2)}</NetoZnesek>\n`;
    xml += `      <NacinPlacila>${escapeXml(o.paymentMethod || "")}</NacinPlacila>\n`;
    xml += `      <ZOI>${escapeXml(o.zoi || "")}</ZOI>\n`;
    xml += `      <EOR>${escapeXml(o.eor || "")}</EOR>\n`;
    xml += `      <Status>${o.status === "storno" ? "STORNO" : "OK"}</Status>\n`;
    xml += `    </Racun>\n`;
  }

  xml += `  </Racuni>\n`;
  xml += `</RacunovodskiExport>\n`;

  return xml;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
