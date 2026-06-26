import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
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
    return NextResponse.json(order);
  } catch (e) {
    console.error("GET /api/orders/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// Brisanje (preklic) naročila
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.order.update({
      where: { id },
      data: { status: "cancelled" },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/orders/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
