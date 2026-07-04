import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Void (hrabti) eno postavko iz odprtega naročila
// Uporabno ko se stranka premisli ali je bila postavka naročena po pomoti
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { itemId } = body as { itemId: string };

    if (!itemId) {
      return NextResponse.json({ error: "Manjka itemId" }, { status: 400 });
    }

    const order = await db.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Naročilo ni najdeno" }, { status: 404 });
    }
    if (order.status !== "open") {
      return NextResponse.json(
        { error: "Hrabtiti se da le postavke iz odprtega naročila" },
        { status: 400 }
      );
    }

    const item = order.items.find((it) => it.id === itemId);
    if (!item) {
      return NextResponse.json({ error: "Postavka ni najdena" }, { status: 404 });
    }

    // Zmanjšaj količino za 1 (ali odstrani če je količina 1)
    if (item.quantity > 1) {
      const updated = await db.orderItem.update({
        where: { id: itemId },
        data: { quantity: item.quantity - 1 },
      });
      // Preračunaj total
      await recalculateOrderTotal(id);
      return NextResponse.json({
        ok: true,
        action: "decremented",
        newQuantity: updated.quantity,
      });
    } else {
      // Odstrani postavko
      await db.orderItem.delete({ where: { id: itemId } });
      await recalculateOrderTotal(id);
      return NextResponse.json({
        ok: true,
        action: "removed",
      });
    }
  } catch (e) {
    console.error("POST /api/orders/[id]/void-item error:", e);
    return NextResponse.json({ error: "Napaka pri hrabtenju postavke" }, { status: 500 });
  }
}

async function recalculateOrderTotal(orderId: string) {
  const items = await db.orderItem.findMany({
    where: { orderId },
  });
  const total = items.reduce((s, it) => s + Number(it.unitPrice) * it.quantity, 0);
  const vatTotal = items.reduce(
    (s, it) => s + Number(it.unitPrice) * it.quantity * it.vatRate,
    0
  );
  await db.order.update({
    where: { id: orderId },
    data: { total, vatTotal },
  });
}
