import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/furs-audit — dnevnik fiskaliziranih računov z ZOI/EOR statusom
// Podpora za ?from=&to=&status=&search=
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    const statusFilter = req.nextUrl.searchParams.get("status"); // "fiscalized" | "pending" | "storno" | "all"
    const search = req.nextUrl.searchParams.get("search");

    // Privzeto: zadnjih 30 dni
    const now = new Date();
    const startDate = from
      ? new Date(from + "T00:00:00")
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to + "T23:59:59") : now;

    const where: {
      restaurantId: string;
      createdAt?: { gte: Date; lte: Date };
      AND?: Array<Record<string, unknown>>;
    } = {
      restaurantId: tenant.id,
      createdAt: { gte: startDate, lte: endDate },
    };

    // Status filter
    if (statusFilter && statusFilter !== "all") {
      where.AND = where.AND || [];
      if (statusFilter === "fiscalized") {
        where.AND.push({ zoi: { not: null } }, { eor: { not: null } });
      } else if (statusFilter === "pending") {
        where.AND.push({ OR: [{ zoi: null }, { eor: null }] }, { stornoOf: null });
      } else if (statusFilter === "storno") {
        where.AND.push({ status: "storno" });
      }
    }

    // Search po receiptNo, zoi, eor
    if (search) {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { receiptNo: { contains: search } },
          { zoi: { contains: search } },
          { eor: { contains: search } },
          { invoiceNumber: { contains: search } },
        ],
      });
    }

    const orders = await db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500, // limit za varnost
      select: {
        id: true,
        receiptNo: true,
        invoiceNumber: true,
        zoi: true,
        eor: true,
        fursXml: true,
        status: true,
        total: true,
        vatTotal: true,
        paymentMethod: true,
        operator: true,
        businessUnit: true,
        cashRegister: true,
        createdAt: true,
        paidAt: true,
        stornoOf: true,
        stornoReason: true,
        stornoAt: true,
        stornoZoi: true,
        stornoEor: true,
      },
    });

    // Pridobi storno "starše" za prikaz povezave
    const stornoParentIds = orders
      .filter((o) => o.stornoOf)
      .map((o) => o.stornoOf as string);
    const stornoParents = stornoParentIds.length > 0
      ? await db.order.findMany({
          where: { id: { in: stornoParentIds } },
          select: { id: true, receiptNo: true, total: true },
        })
      : [];

    const stornoParentMap = new Map(stornoParents.map((p) => [p.id, p]));

    const items = orders.map((o) => {
      const isFiscalized = o.zoi && o.eor;
      const isStorno = o.status === "storno";
      const stornoParent = o.stornoOf ? stornoParentMap.get(o.stornoOf) : null;

      let fursStatus: "fiscalized" | "pending" | "storno" | "error" = "pending";
      if (isStorno && o.stornoZoi && o.stornoEor) fursStatus = "storno";
      else if (isStorno) fursStatus = "error";
      else if (isFiscalized) fursStatus = "fiscalized";
      else if (o.status === "paid") fursStatus = "pending";

      return {
        id: o.id,
        receiptNo: o.receiptNo,
        invoiceNumber: o.invoiceNumber,
        zoi: o.zoi,
        eor: o.eor,
        fursXml: o.fursXml ? "da" : "ne",
        fursStatus,
        status: o.status,
        total: o.total,
        vatTotal: o.vatTotal,
        paymentMethod: o.paymentMethod,
        operator: o.operator,
        businessUnit: o.businessUnit,
        cashRegister: o.cashRegister,
        createdAt: o.createdAt.toISOString(),
        paidAt: o.paidAt?.toISOString() || null,
        stornoOf: o.stornoOf,
        stornoParentReceipt: stornoParent?.receiptNo || null,
        stornoParentTotal: stornoParent?.total || null,
        stornoReason: o.stornoReason,
        stornoAt: o.stornoAt?.toISOString() || null,
        stornoZoi: o.stornoZoi,
        stornoEor: o.stornoEor,
      };
    });

    // Povzetek
    const summary = {
      total: orders.length,
      fiscalized: items.filter((i) => i.fursStatus === "fiscalized").length,
      pending: items.filter((i) => i.fursStatus === "pending").length,
      storno: items.filter((i) => i.fursStatus === "storno").length,
      error: items.filter((i) => i.fursStatus === "error").length,
      withXml: items.filter((i) => i.fursXml === "da").length,
      totalGross: items.reduce((s, i) => s + i.total, 0),
      totalVat: items.reduce((s, i) => s + i.vatTotal, 0),
    };

    return NextResponse.json({
      period: {
        from: startDate.toISOString().slice(0, 10),
        to: endDate.toISOString().slice(0, 10),
      },
      tenant: {
        name: tenant.name,
        taxNumber: tenant.taxNumber,
        businessUnit: tenant.businessUnit,
        cashRegister: tenant.cashRegister,
        fursEnv: tenant.fursEnv,
      },
      items,
      summary,
    });
  } catch (e) {
    console.error("GET /api/furs-audit error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju FURS dnevnika" }, { status: 500 });
  }
}
