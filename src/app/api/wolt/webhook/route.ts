import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWoltConfig, verifyWoltWebhookSignature } from "@/lib/wolt";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// POST /api/wolt/webhook — Wolt pošlje nova naročila sem
// Wolt pošlje signature v X-Wolt-Signature headerju
export async function POST(req: NextRequest) {
  try {
    const config = getWoltConfig();
    if (!config) {
      return NextResponse.json(
        { error: "Wolt ni konfiguriran" },
        { status: 503 }
      );
    }

    const body = await req.text();
    const signature = req.headers.get("x-wolt-signature") || "";

    // Preveri signature (varnost)
    if (!verifyWoltWebhookSignature(body, signature, config)) {
      console.error("[Wolt webhook] Invalid signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body) as {
      event: string;
      order: {
        id: string;
        status: string;
        total_price: number;
        currency: string;
        items: { name: string; quantity: number; unit_price: number; product_id?: string }[];
        customer?: { name: string; phone: string };
        delivery_address?: { street: string; city: string; postal_code: string };
        note?: string;
        pickup_time?: string;
        delivery_time?: string;
      };
      venue_id?: string;
      merchant_id?: string;
    };

    console.log(`[Wolt webhook] Event: ${payload.event}, Order: ${payload.order.id}`);

    // Poišči restavracijo (po merchant_id ali venue_id)
    const restaurant = await db.restaurant.findFirst({
      where: {
        active: true,
        // V produkciji: shranimo wolt_merchant_id v Restaurant model
        // Za zdaj: vzamemo prvo aktivno (POC)
      },
    });

    if (!restaurant) {
      console.error("[Wolt webhook] Ni aktivne restavracije");
      return NextResponse.json({ ok: true }); // Wolt pričakuje 200
    }

    // Shrani Wolt naročilo kot Order v naši bazi
    if (payload.event === "order.create" || payload.event === "order.created") {
      const woltOrder = payload.order;

      // Poišči ali ustvari virtualno mizo za Wolt
      let woltTable = await db.table.findFirst({
        where: { name: "WOLT (dostava)", restaurantId: restaurant.id },
      });
      if (!woltTable) {
        const maxNumber = await db.table.count({ where: { restaurantId: restaurant.id } });
        woltTable = await db.table.create({
          data: {
            number: 950 + maxNumber,
            name: "WOLT (dostava)",
            seats: 0,
            section: "Dostava",
            restaurantId: restaurant.id,
          },
        });
      }

      // Mapiraj Wolt item-e na naše MenuItem-e (po imenu — v produkciji po product_id)
      const menuItems = await db.menuItem.findMany({
        where: { restaurantId: restaurant.id },
      });
      const menuMap = new Map(menuItems.map((m) => [m.name.toLowerCase(), m]));

      let total = 0;
      let vatTotal = 0;
      const orderItemsData: {
        menuItemId: string;
        quantity: number;
        unitPrice: number;
        vatRate: number;
        note: string;
      }[] = [];

      for (const woltItem of woltOrder.items) {
        const menuItem = menuMap.get(woltItem.name.toLowerCase());
        if (menuItem) {
          const unitPrice = woltItem.unit_price / 100; // Wolt uporablja cente
          const lineTotal = unitPrice * woltItem.quantity;
          total += lineTotal;
          vatTotal += lineTotal * menuItem.vatRate;
          orderItemsData.push({
            menuItemId: menuItem.id,
            quantity: woltItem.quantity,
            unitPrice,
            vatRate: menuItem.vatRate,
            note: "[WOLT]",
          });
        }
      }

      // Ustvari Order
      const order = await db.order.create({
        data: {
          restaurantId: restaurant.id,
          tableId: woltTable.id,
          status: "open",
          operator: `Wolt: ${woltOrder.customer?.name || "Gost"}`,
          operatorTaxNo: "SI00000000",
          total: Math.round(total * 100) / 100,
          vatTotal: Math.round(vatTotal * 100) / 100,
          // Označimo da je Wolt naročilo
          // V produkciji: dodamo woltOrderId polje na Order
        },
      });

      if (orderItemsData.length > 0) {
        await db.orderItem.createMany({
          data: orderItemsData.map((it) => ({ ...it, orderId: order.id })),
        });
      }

      console.log(`[Wolt webhook] Order created: ${order.id}, total: ${total} EUR`);
    }

    // Wolt pričakuje 200 OK
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[Wolt webhook] error:", e);
    // Vedno vrni 200 da Wolt ne retry-a
    return NextResponse.json({ ok: true });
  }
}

// GET /api/wolt/webhook — webhook verification (Wolt lahko pošlje challenge)
export async function GET(req: NextRequest) {
  const config = getWoltConfig();
  if (!config) {
    return NextResponse.json({ error: "Wolt ni konfiguriran" }, { status: 503 });
  }

  const challenge = req.nextUrl.searchParams.get("challenge");
  if (challenge) {
    return NextResponse.json({ challenge });
  }

  return NextResponse.json({
    status: "active",
    message: "Wolt webhook je aktiven. Konfiguriraj v Wolt Partner dashboard.",
  });
}
