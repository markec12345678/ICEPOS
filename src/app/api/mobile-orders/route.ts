import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/mobile-orders — seznam mobilnih naročil (QR prednaročila)
// Podpora za ?status=&search=
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const status = req.nextUrl.searchParams.get("status");
    const search = req.nextUrl.searchParams.get("search");

    // Mobile orders so Orders z flags, ki vsebujejo "mobile_order"
    const where: {
      restaurantId: string;
      flags?: { contains: string };
    } = {
      restaurantId: tenant.id,
      flags: { contains: "mobile_order" },
    };

    const orders = await db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        items: { include: { menuItem: true } },
        table: true,
        customer: true,
      },
    });

    let filtered = orders;

    // Filter po statusu
    if (status && status !== "all") {
      filtered = filtered.filter((o) => {
        const flags = o.flags ? JSON.parse(o.flags) : [];
        return flags.includes(`mobile_${status}`);
      });
    }

    // Search
    if (search) {
      filtered = filtered.filter(
        (o) =>
          o.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
          o.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
          o.table?.name?.toLowerCase().includes(search.toLowerCase())
      );
    }

    const items = filtered.map((o) => {
      const flags = o.flags ? JSON.parse(o.flags) : [];
      const mobileStatus = flags.find((f: string) => f.startsWith("mobile_"))?.replace("mobile_", "") || "pending";
      const pickupTime = flags.find((f: string) => f.startsWith("pickup:"))?.replace("pickup:", "");
      const paymentStatus = flags.find((f: string) => f.startsWith("payment:"))?.replace("payment:", "") || "pending";

      return {
        id: o.id,
        invoiceNumber: o.invoiceNumber,
        customerName: o.customer?.name || "Gost",
        customerPhone: o.customer?.phone || null,
        tableName: o.table?.name || "Prevzem",
        total: o.total,
        itemCount: o.items.length,
        createdAt: o.createdAt.toISOString(),
        paidAt: o.paidAt?.toISOString() || null,
        paymentMethod: o.paymentMethod,
        paymentStatus,
        mobileStatus,
        pickupTime,
        items: o.items.map((i) => ({
          name: i.menuItem.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      };
    });

    const summary = {
      total: items.length,
      pending: items.filter((i) => i.mobileStatus === "pending").length,
      preparing: items.filter((i) => i.mobileStatus === "preparing").length,
      ready: items.filter((i) => i.mobileStatus === "ready").length,
      pickedUp: items.filter((i) => i.mobileStatus === "pickedup").length,
      cancelled: items.filter((i) => i.mobileStatus === "cancelled").length,
      totalRevenue: items
        .filter((i) => i.mobileStatus === "pickedup" || i.paidAt)
        .reduce((s, i) => s + i.total, 0),
    };

    return NextResponse.json({
      items,
      summary,
    });
  } catch (e) {
    console.error("GET /api/mobile-orders error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju mobilnih naročil" }, { status: 500 });
  }
}

// PATCH /api/mobile-orders — posodobi status mobilnega naročila
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
    const { orderId, status } = body as { orderId: string; status: string };

    if (!orderId || !status) {
      return NextResponse.json({ error: "orderId in status sta obvezna" }, { status: 400 });
    }

    const validStatuses = ["pending", "preparing", "ready", "pickedup", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Neveljaven status" }, { status: 400 });
    }

    const order = await db.order.findFirst({
      where: { id: orderId, restaurantId: tenant.id },
    });

    if (!order) {
      return NextResponse.json({ error: "Naročilo ni najdeno" }, { status: 404 });
    }

    // Posodobi flags
    let flags: string[] = [];
    try {
      flags = order.flags ? JSON.parse(order.flags) : [];
    } catch {
      flags = [];
    }

    // Odstrani obstoječe mobile_* flag-e
    flags = flags.filter((f) => !f.startsWith("mobile_"));
    flags.push(`mobile_${status}`);

    const updateData: { flags: string; paidAt?: Date; status?: string } = {
      flags: JSON.stringify(flags),
    };

    // Če je pickedup in še ni plačan, označi kot plačano
    if (status === "pickedup" && !order.paidAt) {
      updateData.paidAt = new Date();
      updateData.status = "paid";
    }

    // Če je cancelled, označi kot cancelled
    if (status === "cancelled") {
      updateData.status = "cancelled";
    }

    const updated = await db.order.update({
      where: { id: orderId },
      data: updateData,
    });

    return NextResponse.json({
      id: updated.id,
      flags: updated.flags,
      status: updated.status,
      paidAt: updated.paidAt,
    });
  } catch (e) {
    console.error("PATCH /api/mobile-orders error:", e);
    return NextResponse.json({ error: "Napaka pri posodabljanju" }, { status: 500 });
  }
}
