import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// PATCH /api/happy-hours/[id] — posodobi (toggle active, spremeni)
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
      return NextResponse.json(
        { error: "Samo admin lahko upravlja happy hour" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    // Preveri lastništvo
    const existing = await db.happyHour.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Ni najden" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (typeof body.active === "boolean") updateData.active = body.active;
    if (typeof body.name === "string") updateData.name = body.name;
    if (Array.isArray(body.daysOfWeek)) updateData.daysOfWeek = JSON.stringify(body.daysOfWeek);
    if (typeof body.startTime === "string") updateData.startTime = body.startTime;
    if (typeof body.endTime === "string") updateData.endTime = body.endTime;
    if (body.discountType === "percent" || body.discountType === "fixed") updateData.discountType = body.discountType;
    if (typeof body.discountValue === "number") updateData.discountValue = body.discountValue;
    if (body.categories !== undefined) {
      updateData.categories = typeof body.categories === "string"
        ? body.categories
        : JSON.stringify(body.categories);
    }

    const updated = await db.happyHour.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/happy-hours/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// DELETE /api/happy-hours/[id]
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
    const existing = await db.happyHour.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Ni najden" }, { status: 404 });
    }

    await db.happyHour.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/happy-hours/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
