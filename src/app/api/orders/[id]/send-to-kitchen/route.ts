import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Pošlje odprto naročilo v kuhinjo prek WebSocket (kitchen-service na portu 3003)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await db.order.findUnique({
      where: { id },
      include: {
        table: true,
        items: { include: { menuItem: true } },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Naročilo ni najdeno" },
        { status: 404 }
      );
    }

    const kitchenOrder = {
      id: order.id,
      orderId: order.id,
      tableNumber: order.table.number,
      tableName: order.table.name,
      items: order.items.map((it) => ({
        menuItemId: it.menuItemId,
        name: it.menuItem.name,
        quantity: it.quantity,
        note: it.note,
      })),
      status: "new" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      operator: order.operator,
    };

    const { io } = await import("socket.io-client");

    // Backend → Backend: poveži se direktno na kitchen-service (port 3003)
    // (Caddy gateway je za frontend; backend API rabi direktno povezavo)
    const socket = io("http://localhost:3003", {
      path: "/",
      transports: ["websocket"],
      forceNew: true,
      timeout: 5000,
    });

    return new Promise<NextResponse>((resolve) => {
      const timeout = setTimeout(() => {
        socket.disconnect();
        resolve(
          NextResponse.json(
            { error: "Timeout pri povezavi s kuhinjo" },
            { status: 504 }
          )
        );
      }, 5000);

      socket.on("connect", () => {
        socket.emit("order:new", kitchenOrder);
        clearTimeout(timeout);
        socket.disconnect();
        resolve(
          NextResponse.json({
            ok: true,
            message: `Naročilo poslano v kuhinjo (Miza ${order.table.name})`,
            itemCount: order.items.length,
          })
        );
      });

      socket.on("connect_error", () => {
        clearTimeout(timeout);
        socket.disconnect();
        resolve(
          NextResponse.json(
            { error: "Kuhinja ni na voljo (service offline)" },
            { status: 503 }
          )
        );
      });
    });
  } catch (e) {
    console.error("POST /api/orders/[id]/send-to-kitchen error:", e);
    return NextResponse.json(
      { error: "Napaka pri pošiljanju v kuhinjo" },
      { status: 500 }
    );
  }
}
