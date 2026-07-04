import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDeliverectConfig, verifyDeliverectWebhookSignature, type DeliverectOrder } from "@/lib/deliverect";

export const dynamic = "force-dynamic";

// POST /api/deliverect/webhook — Deliverect pošlje nova naročila sem
// Podprti event-i:
//   - order.create: novo naročilo iz kateregakoli kanala (UberEats, DoorDash, itd.)
//   - order.update: posodobitev statusa naročila
//   - order.cancel: preklic naročila
export async function POST(req: NextRequest) {
  try {
    const config = getDeliverectConfig();
    if (!config) {
      return NextResponse.json(
        { error: "Deliverect ni konfiguriran" },
        { status: 503 }
      );
    }

    const body = await req.text();
    const signature = req.headers.get("x-deliverect-signature") || "";

    // Preveri signature (varnost)
    if (!verifyDeliverectWebhookSignature(body, signature, config)) {
      console.error("[Deliverect webhook] Invalid signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body) as {
      event: string;
      order?: DeliverectOrder;
      locationId?: string;
    };

    console.log(`[Deliverect webhook] Event: ${payload.event}, Channel: ${payload.order?.channel || "N/A"}`);

    // Poišči restavracijo
    // Poišči tenant po locationId (Deliverect webhook payload)
    const locationId = (payload as any).locationId || (payload as any).channelLinkId;
    let restaurant = null;
    if (locationId) {
      restaurant = await db.restaurant.findFirst({
        where: { deliverectLocationId: locationId, active: true },
      });
    }
    if (!restaurant) {
      restaurant = await db.restaurant.findFirst({
        where: { active: true },
      });
    }

    if (!restaurant) {
      console.error("[Deliverect webhook] Ni aktivne restavracije");
      return NextResponse.json({ ok: true });
    }

    // Obdelaj order.create event
    if (payload.event === "order.create" && payload.order) {
      const dOrder = payload.order;
      const channel = dOrder.channel || "unknown";

      // Poišči ali ustvari virtualno mizo za dostavo
      let table = await db.table.findFirst({
        where: {
          name: `DELIVERECT (${channel})`,
          restaurantId: restaurant.id,
        },
      });
      if (!table) {
        const maxNumber = await db.table.count({ where: { restaurantId: restaurant.id } });
        table = await db.table.create({
          data: {
            number: 960 + maxNumber,
            name: `DELIVERECT (${channel})`,
            seats: 0,
            section: "Dostava",
            restaurantId: restaurant.id,
          },
        });
      }

      // Mapiraj Deliverect item-e na naše MenuItem-e (po PLU-ju)
      const menuItems = await db.menuItem.findMany({
        where: { restaurantId: restaurant.id },
      });
      const menuMap = new Map(menuItems.map((m) => [m.id, m]));

      let total = 0;
      let vatTotal = 0;
      const orderItemsData: {
        menuItemId: string;
        quantity: number;
        unitPrice: number;
        vatRate: number;
        note: string;
      }[] = [];

      for (const dItem of dOrder.items) {
        // Poišči MenuItem po PLU (ki je MenuItem ID)
        const menuItem = menuMap.get(dItem.plu);
        if (menuItem) {
          const unitPrice = dItem.price / 100; // Deliverect uporablja cente
          const lineTotal = unitPrice * dItem.quantity;
          total += lineTotal;
          vatTotal += lineTotal * menuItem.vatRate;
          orderItemsData.push({
            menuItemId: menuItem.id,
            quantity: dItem.quantity,
            unitPrice,
            vatRate: menuItem.vatRate,
            note: `[${channel}] ${dItem.notes || ""}`.trim(),
          });
        }
      }

      // Ustvari Order
      const order = await db.order.create({
        data: {
          restaurantId: restaurant.id,
          tableId: table.id,
          status: "open",
          operator: `Deliverect: ${dOrder.customer?.name || channel} #${dOrder.channelOrderId}`,
          operatorTaxNo: "SI00000000",
          total: Math.round(total * 100) / 100,
          vatTotal: Math.round(vatTotal * 100) / 100,
        },
      });

      if (orderItemsData.length > 0) {
        await db.orderItem.createMany({
          data: orderItemsData.map((it) => ({ ...it, orderId: order.id })),
        });
      }

      console.log(`[Deliverect webhook] Order created: ${order.id}, channel: ${channel}, total: ${total} EUR`);

      // Vrni status 10 (accepted) — samodejno sprejmi
      return NextResponse.json({
        status: 10, // accepted
        orderId: order.id,
      });
    }

    // order.update — posodobi status v naši bazi (če imamo naročilo)
    if (payload.event === "order.update" && payload.order) {
      // V produkciji: posodobi interni order status
      console.log(`[Deliverect webhook] Order update: ${payload.order._id}, status: ${payload.order.status}`);
    }

    // order.cancel — označi kot cancelled
    if (payload.event === "order.cancel" && payload.order) {
      console.log(`[Deliverect webhook] Order cancelled: ${payload.order._id}`);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[Deliverect webhook] error:", e);
    // Vedno vrni 200 da Deliverect ne retry-a
    return NextResponse.json({ ok: true });
  }
}

// GET /api/deliverect/webhook — health check
export async function GET(req: NextRequest) {
  const config = getDeliverectConfig();
  if (!config) {
    return NextResponse.json({ error: "Deliverect ni konfiguriran" }, { status: 503 });
  }

  return NextResponse.json({
    status: "active",
    message: "Deliverect webhook je aktiven. Konfiguriraj v Deliverect dashboard.",
    locationId: config.locationId,
    env: config.env,
  });
}
