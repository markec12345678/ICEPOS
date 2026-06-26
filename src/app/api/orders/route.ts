import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Vsa naročila (z opcijskim filtrom na status)
export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status");
    const orders = await db.order.findMany({
      where: status ? { status } : {},
      include: {
        table: true,
        items: { include: { menuItem: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json(orders);
  } catch (e) {
    console.error("GET /api/orders error:", e);
    return NextResponse.json(
      { error: "Napaka pri branju naročil" },
      { status: 500 }
    );
  }
}

// Ustvari ali posodobi odprto naročilo za mizo
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tableId, items } = body as {
      tableId: string;
      items: {
        menuItemId: string;
        quantity: number;
        note?: string;
        modifiers?: string | null;
        unitPrice?: number;
      }[];
    };

    if (!tableId || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (tableId, items)" },
        { status: 400 }
      );
    }

    // Poišči obstoječe odprto naročilo za to mizo
    let order = await db.order.findFirst({
      where: { tableId, status: "open" },
    });

    if (!order) {
      order = await db.order.create({
        data: { tableId, status: "open", operator: "Ana" },
      });
    } else {
      // Počisti stare postavke (nadomestimo z novim vozicom)
      await db.orderItem.deleteMany({ where: { orderId: order.id } });
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
        // unitPrice iz requesta (vključuje modifierje) ali fallback na osnovno ceno
        const unitPrice =
          typeof i.unitPrice === "number" && i.unitPrice > 0
            ? i.unitPrice
            : m.price;
        const lineTotal = unitPrice * i.quantity;
        total += lineTotal;
        vatTotal += lineTotal * m.vatRate;
        return {
          orderId: order!.id,
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          unitPrice,
          vatRate: m.vatRate,
          note: i.note || null,
          modifiers: i.modifiers || null,
        };
      });

    if (orderItemsData.length > 0) {
      await db.orderItem.createMany({ data: orderItemsData });
    }

    const updated = await db.order.update({
      where: { id: order.id },
      data: { total, vatTotal },
      include: {
        table: true,
        items: { include: { menuItem: true } },
      },
    });

    return NextResponse.json(updated, { status: 201 });
  } catch (e) {
    console.error("POST /api/orders error:", e);
    return NextResponse.json(
      { error: "Napaka pri shranjevanju naročila" },
      { status: 500 }
    );
  }
}
