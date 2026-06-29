import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const { id } = await params;
    const order = await db.order.findFirst({
      where: { id, restaurantId: tenant.id },
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
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const { id } = await params;
    const order = await db.order.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!order) {
      return NextResponse.json({ error: "Naročilo ni najdeno" }, { status: 404 });
    }
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
