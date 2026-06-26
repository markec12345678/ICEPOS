import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof body.status === "string") data.status = body.status;
    if (typeof body.customerName === "string") data.customerName = body.customerName;
    if (typeof body.customerPhone === "string") data.customerPhone = body.customerPhone;
    if (typeof body.partySize === "number") data.partySize = body.partySize;
    if (typeof body.date === "string") data.date = body.date;
    if (typeof body.time === "string") data.time = body.time;
    if (typeof body.duration === "number") data.duration = body.duration;
    if (typeof body.note === "string") data.note = body.note;

    const updated = await db.reservation.update({
      where: { id },
      data,
      include: { table: true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/reservations/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.reservation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/reservations/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
