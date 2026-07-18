import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/tax-free — seznam tax-free računov
// Podpora za ?from=&to=&status=&search=
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    const status = req.nextUrl.searchParams.get("status"); // "pending" | "approved" | "rejected" | "paid" | "all"
    const search = req.nextUrl.searchParams.get("search");

    // Tax-free računi so shranjeni kot Orders z flags, ki vsebujejo "tax_free"
    // Uporabljamo note ali flags polje za metadata. Za ta MVP uporabljamo
    // inventarizacijo: poiščemo plačane račune z visokim zneskom (>50€) in
    // uporabniško def. Tax-free obdelava je preko PATCH endpointa.

    // Za potrebe tega MVP bomo tax-free sledili preko invoiceNumber prefix-a
    // ali preko flags polja (JSON array z "tax_free")

    const now = new Date();
    const startDate = from ? new Date(from + "T00:00:00") : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to + "T23:59:59") : now;

    const where: {
      restaurantId: string;
      status: string;
      paidAt?: { gte: Date; lte: Date };
      flags?: { contains: string };
    } = {
      restaurantId: tenant.id,
      status: "paid",
      paidAt: { gte: startDate, lte: endDate },
      flags: { contains: "tax_free" },
    };

    const orders = await db.order.findMany({
      where,
      orderBy: { paidAt: "desc" },
      take: 200,
      include: { items: { include: { menuItem: true } } },
    });

    // Filtriranje po statusu (parse iz flags)
    let filtered = orders;
    if (status && status !== "all") {
      filtered = orders.filter((o) => {
        const flags = o.flags ? JSON.parse(o.flags) : [];
        return flags.includes(`tax_free_${status}`);
      });
    }

    // Search
    if (search) {
      filtered = filtered.filter(
        (o) =>
          o.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
          o.operator.toLowerCase().includes(search.toLowerCase())
      );
    }

    const items = filtered.map((o) => {
      const flags = o.flags ? JSON.parse(o.flags) : [];
      const tfStatus = flags.find((f: string) => f.startsWith("tax_free_"))?.replace("tax_free_", "") || "pending";
      const passportCountry = flags.find((f: string) => f.startsWith("country:"))?.replace("country:", "") || null;
      const passportNumber = flags.find((f: string) => f.startsWith("passport:"))?.replace("passport:", "") || null;

      return {
        id: o.id,
        invoiceNumber: o.invoiceNumber,
        receiptNo: o.receiptNo,
        total: o.total,
        vatTotal: o.vatTotal,
        netTotal: o.total - o.vatTotal,
        refundAmount: o.vatTotal, // povračilo DDV
        paidAt: o.paidAt?.toISOString() || null,
        operator: o.operator,
        customerCountry: passportCountry,
        passportNumber,
        tfStatus,
        itemCount: o.items.length,
      };
    });

    const summary = {
      total: items.length,
      pending: items.filter((i) => i.tfStatus === "pending").length,
      approved: items.filter((i) => i.tfStatus === "approved").length,
      rejected: items.filter((i) => i.tfStatus === "rejected").length,
      paid: items.filter((i) => i.tfStatus === "paid").length,
      totalRefundable: items.reduce((s, i) => s + i.refundAmount, 0),
      totalProcessed: items
        .filter((i) => i.tfStatus === "paid")
        .reduce((s, i) => s + i.refundAmount, 0),
    };

    return NextResponse.json({
      period: {
        from: startDate.toISOString().slice(0, 10),
        to: endDate.toISOString().slice(0, 10),
      },
      tenant: {
        name: tenant.name,
        taxNumber: tenant.taxNumber,
      },
      items,
      summary,
    });
  } catch (e) {
    console.error("GET /api/tax-free error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju tax-free računov" }, { status: 500 });
  }
}

// PATCH /api/tax-free/[orderId] — posodobi tax-free status
export async function PATCH(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp) {
      return NextResponse.json({ error: "Potrebna je prijava" }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, status, passportNumber, country } = body as {
      orderId: string;
      status: "pending" | "approved" | "rejected" | "paid";
      passportNumber?: string;
      country?: string;
    };

    if (!orderId || !status) {
      return NextResponse.json({ error: "orderId in status sta obvezna" }, { status: 400 });
    }

    const order = await db.order.findFirst({
      where: { id: orderId, restaurantId: tenant.id },
    });

    if (!order) {
      return NextResponse.json({ error: "Račun ni najden" }, { status: 404 });
    }

    // Posodobi flags
    let flags: string[] = [];
    try {
      flags = order.flags ? JSON.parse(order.flags) : [];
    } catch {
      flags = [];
    }

    // Odstrani obstoječe tax_free_* flag-e
    flags = flags.filter((f) => !f.startsWith("tax_free_"));
    // Dodaj novi status
    flags.push(`tax_free_${status}`);

    // Dodaj passport in country če sta podana
    if (passportNumber) {
      flags = flags.filter((f) => !f.startsWith("passport:"));
      flags.push(`passport:${passportNumber}`);
    }
    if (country) {
      flags = flags.filter((f) => !f.startsWith("country:"));
      flags.push(`country:${country}`);
    }

    const updated = await db.order.update({
      where: { id: orderId },
      data: { flags: JSON.stringify(flags) },
    });

    return NextResponse.json({
      id: updated.id,
      flags: updated.flags,
      status,
    });
  } catch (e) {
    console.error("PATCH /api/tax-free error:", e);
    return NextResponse.json({ error: "Napaka pri posodabljanju" }, { status: 500 });
  }
}
