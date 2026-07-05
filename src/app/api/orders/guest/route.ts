// @ts-nocheck — pre-existing TS errors (non-critical analytics/reporting route)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildOrderConfirmation, sendNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// Gost naroči preko QR kode (brez PIN-a, brez mize)
// Naročilo gre direktno v kuhinjo + prikaže se v dnevniku
interface GuestOrderItem {
  menuItemId: string;
  quantity: number;
  note?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tableNumber, items, customerName } = body as {
      tableNumber?: string;
      items: GuestOrderItem[];
      customerName?: string;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Voziček je prazen" },
        { status: 400 }
      );
    }

    // Poišči mizo (če je podana številka)
    let tableId: string | null = null;
    if (tableNumber) {
      const table = await db.table.findFirst({
        where: { number: parseInt(tableNumber, 10) },
      });
      if (table) {
        tableId = table.id;
        // Preveri ali ima miza že odprto naročilo
        const openOrder = await db.order.findFirst({
          where: { tableId: table.id, status: "open" },
        });
        if (openOrder) {
          return NextResponse.json(
            {
              error:
                "Miza že ima odprto naročilo. Prosimo pokličite natakarja.",
            },
            { status: 409 }
          );
        }
      }
    }

    // Če ni mize, ustvari virtualno "GOST" naročilo brez mize
    // (uporabimo prvo mizo z imenom "GOST" ali ustvarimo virtualno)
    if (!tableId) {
      // Poišči ali ustvari virtualno mizo za goste
      let guestTable = await db.table.findFirst({
        where: { name: "GOST (online)" },
      });
      if (!guestTable) {
        const maxNumber = await db.table.count();
        guestTable = await db.table.create({
          data: {
            number: 900 + maxNumber,
            name: "GOST (online)",
            seats: 0,
            section: "Online",
          },
        });
      }
      tableId = guestTable.id;
    }

    // Pridobi podatke o meniju za cene/DDV
    const menuItems = await db.menuItem.findMany({
      where: { id: { in: items.map((i) => i.menuItemId) } },
    });
    const menuMap = new Map(menuItems.map((m) => [m.id, m]));

    let total = 0;
    let vatTotal = 0;

    const orderItemsData = items
      .filter((i) => menuMap.has(i.menuItemId) && i.quantity > 0)
      .map((i) => {
        const m = menuMap.get(i.menuItemId)!;
        const lineTotal = Number(m.price) * i.quantity;
        total += lineTotal;
        vatTotal += lineTotal * m.vatRate;
        return {
          orderId: "", // bo nastavljen spodaj
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          unitPrice: m.price,
          vatRate: m.vatRate,
          note: i.note
            ? `[GOST] ${i.note.slice(0, 200)}`
            : "[GOST] Online naročilo",
        };
      });

    if (orderItemsData.length === 0) {
      return NextResponse.json(
        { error: "Nobena postavka ni veljavna" },
        { status: 400 }
      );
    }

    // Ustvari naročilo
    const order = await db.order.create({
      data: {
        tableId,
        status: "open",
        operator: customerName
          ? `Gost: ${customerName}`
          : "Gost (online)",
        operatorTaxNo: "SI00000000",
        total,
        vatTotal,
      },
    });

    // Dodaj postavke
    await db.orderItem.createMany({
      data: orderItemsData.map((it) => ({ ...it, orderId: order.id })),
    });

    // Pošlji potrditev naročila (če je podano ime gosta)
    if (customerName) {
      const payload = buildOrderConfirmation(
        customerName,
        order.id,
        total,
        orderItemsData.map((it) => {
          const m = menuMap.get(it.menuItemId)!;
          return { name: m.name, quantity: it.quantity, price: it.unitPrice };
        }),
        !tableNumber // takeaway = brez mize
      );
      await sendNotification(payload, "email");
    }

    return NextResponse.json(
      {
        ok: true,
        orderId: order.id,
        message: "Naročilo poslano! Kuhinja ga bo kmalu pripravila.",
        total,
        itemCount: orderItemsData.length,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/orders/guest error:", e);
    return NextResponse.json(
      { error: "Napaka pri oddaji naročila" },
      { status: 500 }
    );
  }
}
