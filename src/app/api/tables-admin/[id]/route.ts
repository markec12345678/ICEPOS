import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authOp = await getOperatorFromRequest(req);
    if (!authOp) {
      return NextResponse.json({ error: "Potrebna je prijava" }, { status: 401 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof body.number === "number") {
      // Preveri unikatnost
      const existing = await db.table.findFirst({
        where: { number: body.number, NOT: { id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Miza s to številko že obstaja" },
          { status: 409 }
        );
      }
      data.number = body.number;
    }
    if (typeof body.name === "string") data.name = body.name;
    if (typeof body.seats === "number") data.seats = body.seats;
    if (typeof body.section === "string") data.section = body.section;

    const updated = await db.table.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/tables-admin/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authOp = await getOperatorFromRequest(req);
    if (!authOp) {
      return NextResponse.json({ error: "Potrebna je prijava" }, { status: 401 });
    }

    // Preveri da miza nima odprtih naročil
    const openOrders = await db.order.findFirst({
      where: { tableId: id, status: "open" },
    });
    if (openOrders) {
      return NextResponse.json(
        { error: "Miza ima odprto naročilo — najprej ga zaključi" },
        { status: 400 }
      );
    }

    await db.table.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/tables-admin/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
