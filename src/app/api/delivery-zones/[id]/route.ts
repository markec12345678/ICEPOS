import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/delivery-zones/[id]
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
    const zone = await db.deliveryZone.findFirst({
      where: { id, restaurantId: tenant.id },
    });

    if (!zone) {
      return NextResponse.json({ error: "Cona ni najdena" }, { status: 404 });
    }

    return NextResponse.json(zone);
  } catch (e) {
    console.error("GET /api/delivery-zones/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// PATCH /api/delivery-zones/[id]
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
        { error: "Samo admin lahko ureja cone" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await db.deliveryZone.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Cona ni najdena" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowed = [
      "name", "minOrderValue", "deliveryFee", "freeDeliveryThreshold",
      "estimatedTime", "active", "note",
    ];
    for (const key of allowed) {
      if (key in body) updateData[key] = body[key];
    }
    if (body.postalCodes && Array.isArray(body.postalCodes)) {
      updateData.postalCodes = JSON.stringify(body.postalCodes);
    }

    const updated = await db.deliveryZone.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/delivery-zones/[id] error:", e);
    return NextResponse.json({ error: "Napaka pri posodabljanju" }, { status: 500 });
  }
}

// DELETE /api/delivery-zones/[id]
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
        { error: "Samo admin lahko briše cone" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await db.deliveryZone.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Cona ni najdena" }, { status: 404 });
    }

    await db.deliveryZone.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/delivery-zones/[id] error:", e);
    return NextResponse.json({ error: "Napaka pri brisanju" }, { status: 500 });
  }
}
