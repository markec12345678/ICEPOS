import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/pre-orders — prednaročila za prevzem
// Podpora za ?status=&search=&date=
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const status = req.nextUrl.searchParams.get("status");
    const search = req.nextUrl.searchParams.get("search");
    const date = req.nextUrl.searchParams.get("date");

    // Pre-orders so Orders z flags, ki vsebujejo "pre_order"
    const where: {
      restaurantId: string;
      flags?: { contains: string };
    } = {
      restaurantId: tenant.id,
      flags: { contains: "pre_order" },
    };

    let orders = await db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        items: { include: { menuItem: true } },
        table: true,
        customer: true,
      },
    });

    // Filter po statusu
    if (status && status !== "all") {
      orders = orders.filter((o) => {
        const flags = o.flags ? JSON.parse(o.flags) : [];
        return flags.includes(`preorder_${status}`);
      });
    }

    // Filter po datumu prevzema
    if (date) {
      orders = orders.filter((o) => {
        const flags = o.flags ? JSON.parse(o.flags) : [];
        const pickupDate = flags.find((f: string) => f.startsWith("pickup_date:"))?.replace("pickup_date:", "");
        return pickupDate === date;
      });
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.invoiceNumber?.toLowerCase().includes(q) ||
          o.customer?.name?.toLowerCase().includes(q) ||
          o.customer?.phone?.includes(search)
      );
    }

    const items = orders.map((o) => {
      const flags = o.flags ? JSON.parse(o.flags) : [];
      const pickupTime = flags.find((f: string) => f.startsWith("pickup_time:"))?.replace("pickup_time:", "");
      const pickupDate = flags.find((f: string) => f.startsWith("pickup_date:"))?.replace("pickup_date:", "");
      const preOrderStatus = flags.find((f: string) => f.startsWith("preorder_"))?.replace("preorder_", "") || "pending";
      const customerNote = flags.find((f: string) => f.startsWith("note:"))?.replace("note:", "");

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
        preOrderStatus,
        pickupDate,
        pickupTime,
        customerNote,
        items: o.items.map((i) => ({
          name: i.menuItem.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          note: i.note,
        })),
      };
    });

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const summary = {
      total: items.length,
      pending: items.filter((i) => i.preOrderStatus === "pending").length,
      preparing: items.filter((i) => i.preOrderStatus === "preparing").length,
      ready: items.filter((i) => i.preOrderStatus === "ready").length,
      pickedUp: items.filter((i) => i.preOrderStatus === "pickedup").length,
      cancelled: items.filter((i) => i.preOrderStatus === "cancelled").length,
      todayPickups: items.filter((i) => i.pickupDate === today).length,
      totalRevenue: items
        .filter((i) => i.paidAt || i.preOrderStatus === "pickedup")
        .reduce((s, i) => s + i.total, 0),
    };

    return NextResponse.json({ items, summary });
  } catch (e) {
    console.error("GET /api/pre-orders error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju prednaročil" }, { status: 500 });
  }
}

// PATCH /api/pre-orders — posodobi status prednaročila
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

    let flags: string[] = [];
    try {
      flags = order.flags ? JSON.parse(order.flags) : [];
    } catch {
      flags = [];
    }

    flags = flags.filter((f) => !f.startsWith("preorder_"));
    flags.push(`preorder_${status}`);

    const updateData: { flags: string; paidAt?: Date; status?: string } = {
      flags: JSON.stringify(flags),
    };

    if (status === "pickedup" && !order.paidAt) {
      updateData.paidAt = new Date();
      updateData.status = "paid";
    }

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
    console.error("PATCH /api/pre-orders error:", e);
    return NextResponse.json({ error: "Napaka pri posodabljanju" }, { status: 500 });
  }
}
