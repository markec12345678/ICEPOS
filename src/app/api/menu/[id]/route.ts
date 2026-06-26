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
    if (typeof body.name === "string") data.name = body.name;
    if (typeof body.category === "string") data.category = body.category;
    if (typeof body.price === "number") data.price = body.price;
    if (typeof body.vatRate === "number") data.vatRate = body.vatRate;
    if (typeof body.desc === "string") data.desc = body.desc;
    if (typeof body.available === "boolean") data.available = body.available;

    const updated = await db.menuItem.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/menu/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.menuItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/menu/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
