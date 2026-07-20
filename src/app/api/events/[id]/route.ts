import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/events/[id]
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
    const event = await db.event.findFirst({
      where: { id, restaurantId: tenant.id },
    });

    if (!event) {
      return NextResponse.json({ error: "Dogodek ni najden" }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (e) {
    console.error("GET /api/events/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// PATCH /api/events/[id]
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
    if (!authOp) {
      return NextResponse.json({ error: "Potrebna je prijava" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await db.event.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Dogodek ni najden" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowed = [
      "title", "type", "customerName", "customerPhone", "customerEmail",
      "guestCount", "location", "isOffsite", "offsiteAddress", "setupTime",
      "packagePrice", "pricePerGuest", "totalQuoted", "depositPaid",
      "status", "menu", "requirements", "note", "assignedOperator",
    ];
    for (const key of allowed) {
      if (key in body) updateData[key] = body[key];
    }
    if (body.eventDate) updateData.eventDate = new Date(body.eventDate);
    if (body.endDate) updateData.endDate = new Date(body.endDate);

    // Ponovno izračunaj totalQuoted če se spremenijo packagePrice/guestCount/pricePerGuest
    if ("packagePrice" in body || "guestCount" in body || "pricePerGuest" in body) {
      const guests = body.guestCount ?? existing.guestCount;
      const pkg = body.packagePrice ?? existing.packagePrice;
      const ppg = body.pricePerGuest ?? existing.pricePerGuest;
      updateData.totalQuoted = pkg + guests * ppg;
    }

    const updated = await db.event.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/events/[id] error:", e);
    return NextResponse.json({ error: "Napaka pri posodabljanju" }, { status: 500 });
  }
}

// DELETE /api/events/[id]
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
        { error: "Samo admin lahko briše dogodke" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await db.event.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Dogodek ni najden" }, { status: 404 });
    }

    await db.event.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/events/[id] error:", e);
    return NextResponse.json({ error: "Napaka pri brisanju" }, { status: 500 });
  }
}
