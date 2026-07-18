import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/equipment/[id] — posamezna oprema z vsemi maintenance logi
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

    const equipment = await db.equipment.findFirst({
      where: { id, restaurantId: tenant.id },
      include: {
        maintenanceLogs: {
          orderBy: { serviceDate: "desc" },
        },
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: "Oprema ni najdena" }, { status: 404 });
    }

    return NextResponse.json(equipment);
  } catch (e) {
    console.error("GET /api/equipment/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// PATCH /api/equipment/[id] — posodobi opremo
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
        { error: "Samo admin lahko upravlja opremo" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await db.equipment.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Oprema ni najdena" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowed = [
      "name", "category", "serialNumber", "manufacturer", "model", "location",
      "purchaseCost", "serviceIntervalDays", "status", "note",
    ];
    for (const key of allowed) {
      if (key in body) updateData[key] = body[key];
    }
    if (body.purchaseDate) updateData.purchaseDate = new Date(body.purchaseDate);
    if (body.warrantyExpiry) updateData.warrantyExpiry = new Date(body.warrantyExpiry);
    if (body.nextServiceDate) updateData.nextServiceDate = new Date(body.nextServiceDate);

    const updated = await db.equipment.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/equipment/[id] error:", e);
    return NextResponse.json({ error: "Napaka pri posodabljanju" }, { status: 500 });
  }
}

// DELETE /api/equipment/[id] — izbriši opremo
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
        { error: "Samo admin lahko briše opremo" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await db.equipment.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Oprema ni najdena" }, { status: 404 });
    }

    await db.equipment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/equipment/[id] error:", e);
    return NextResponse.json({ error: "Napaka pri brisanju" }, { status: 500 });
  }
}
