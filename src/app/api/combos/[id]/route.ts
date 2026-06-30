import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// PATCH /api/combos/[id] — posodobi combo (toggle active, itd.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json({ error: "Samo admin" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.comboMeal.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Ni najden" }, { status: 404 });
    }

    const body = await req.json();
    const updateData: Record<string, unknown> = {};
    if (typeof body.active === "boolean") updateData.active = body.active;
    if (typeof body.name === "string") updateData.name = body.name;
    if (typeof body.description === "string") updateData.description = body.description;
    if (typeof body.price === "number") updateData.price = body.price;
    if (typeof body.icon === "string") updateData.icon = body.icon;

    const updated = await db.comboMeal.update({
      where: { id },
      data: updateData,
      include: { slots: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/combos/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// DELETE /api/combos/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json({ error: "Samo admin" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.comboMeal.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Ni najden" }, { status: 404 });
    }

    await db.comboMeal.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/combos/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
