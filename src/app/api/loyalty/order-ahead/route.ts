import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { sendNotification, buildOrderConfirmation } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// POST /api/loyalty/order-ahead — gost naroči pred prihodom (preko Loyalty App)
// Body: { token: customerId, items: [{menuItemId, quantity, note}], pickupTime: "19:30", type: "dinein"|"takeaway" }
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const body = await req.json();
    const { token, items, pickupTime, type } = body as {
      token: string;
      items: { menuItemId: string; quantity: number; note?: string }[];
      pickupTime: string;
      type: "dinein" | "takeaway";
    };

    if (!token || !items || !Array.isArray(items) || items.length === 0 || !pickupTime) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (token, items, pickupTime)" },
        { status: 400 }
      );
    }

    // Poišči stranko
    const customer = await db.customer.findFirst({
      where: { id: token, restaurantId: tenant.id },
    });

    if (!customer) {
      return NextResponse.json({ error: "Stranka ni najdena" }, { status: 404 });
    }

    // Poišči ali ustvari virtualno mizo za order ahead
    let table = await db.table.findFirst({
      where: { name: "ORDER AHEAD", restaurantId: tenant.id },
    });
    if (!table) {
      const maxNumber = await db.table.count({ where: { restaurantId: tenant.id } });
      table = await db.table.create({
        data: {
          number: 970 + maxNumber,
          name: "ORDER AHEAD",
          seats: 0,
          section: "Online",
          restaurantId: tenant.id,
        },
      });
    }

    // Pridobi podatke o meniju za cene/DDV
    const menuItems = await db.menuItem.findMany({
      where: {
        id: { in: items.map((i) => i.menuItemId) },
        restaurantId: tenant.id,
      },
    });
    const menuMap = new Map(menuItems.map((m) => [m.id, m]));

    let total = 0;
    let vatTotal = 0;

    const orderItemsData = items
      .filter((i) => menuMap.has(i.menuItemId) && i.quantity > 0)
      .map((i) => {
        const m = menuMap.get(i.menuItemId)!;
        const lineTotal = m.price * i.quantity;
        total += lineTotal;
        vatTotal += lineTotal * m.vatRate;
        return {
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          unitPrice: m.price,
          vatRate: m.vatRate,
          note: i.note ? `[ORDER AHEAD ${pickupTime}] ${i.note}` : `[ORDER AHEAD ${pickupTime}]`,
        };
      });

    if (orderItemsData.length === 0) {
      return NextResponse.json({ error: "Nobena postavka ni veljavna" }, { status: 400 });
    }

    // Ustvari naročilo
    const order = await db.order.create({
      data: {
        restaurantId: tenant.id,
        tableId: table.id,
        status: "open",
        operator: `Order Ahead: ${customer.name} (${pickupTime}, ${type})`,
        operatorTaxNo: "SI00000000",
        total,
        vatTotal,
        customerId: customer.id,
      },
    });

    await db.orderItem.createMany({
      data: orderItemsData.map((it) => ({ ...it, orderId: order.id })),
    });

    // Dodaj loyalty točke (1 točka / 10€)
    const pointsToAdd = Math.floor(total / 10);
    await db.customer.update({
      where: { id: customer.id },
      data: {
        points: { increment: pointsToAdd },
        totalSpent: { increment: total },
        visitCount: { increment: 1 },
      },
    });

    // Pošlji potrditev
    const payload = buildOrderConfirmation(
      customer.name,
      order.id,
      total,
      items.map((i) => {
        const m = menuMap.get(i.menuItemId)!;
        return { name: m.name, quantity: i.quantity, price: m.price };
      }),
      type === "takeaway"
    );
    if (customer.email || customer.phone) {
      payload.to = customer.email || customer.phone || "";
      await sendNotification(payload, customer.email ? "email" : "sms");
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      total,
      pointsEarned: pointsToAdd,
      pickupTime,
      message: `Naročilo uspešno! Pridobite ${pointsToAdd} točk. Prevzem: ${pickupTime}`,
    });
  } catch (e) {
    console.error("POST /api/loyalty/order-ahead error:", e);
    return NextResponse.json({ error: "Napaka pri naročanju" }, { status: 500 });
  }
}

// GET /api/loyalty/order-ahead?token=xxx — vrne prejšnja naročila stranke
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Manjka token" }, { status: 401 });
    }

    const orders = await db.order.findMany({
      where: {
        customerId: token,
        restaurantId: tenant.id,
        operator: { contains: "Order Ahead" },
      },
      include: {
        items: { include: { menuItem: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json(orders);
  } catch (e) {
    console.error("GET /api/loyalty/order-ahead error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
