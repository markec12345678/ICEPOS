import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/energy/[id]
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
    const reading = await db.energyReading.findFirst({
      where: { id, restaurantId: tenant.id },
    });

    if (!reading) {
      return NextResponse.json({ error: "Obris ni najden" }, { status: 404 });
    }

    return NextResponse.json(reading);
  } catch (e) {
    console.error("GET /api/energy/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// PATCH /api/energy/[id]
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
        { error: "Samo admin lahko ureja obrisе" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await db.energyReading.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Obris ni najden" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowed = ["type", "value", "unit", "cost", "meterNumber", "note"];
    for (const key of allowed) {
      if (key in body) updateData[key] = body[key];
    }
    if (body.readingDate) updateData.readingDate = new Date(body.readingDate);

    // Ponovno izračunaj costPerUnit
    const newValue = body.value ?? existing.value;
    const newCost = body.cost ?? existing.cost;
    updateData.costPerUnit = newValue > 0 ? newCost / newValue : 0;

    const updated = await db.energyReading.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/energy/[id] error:", e);
    return NextResponse.json({ error: "Napaka pri posodabljanju" }, { status: 500 });
  }
}

// DELETE /api/energy/[id]
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
      return NextResponse.json(
        { error: "Samo admin lahko briše obrisе" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await db.energyReading.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Obris ni najden" }, { status: 404 });
    }

    await db.energyReading.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/energy/[id] error:", e);
    return NextResponse.json({ error: "Napaka pri brisanju" }, { status: 500 });
  }
}
