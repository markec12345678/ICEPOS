import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/vouchers/[id]
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
    const voucher = await db.voucher.findFirst({
      where: { id, restaurantId: tenant.id },
    });

    if (!voucher) {
      return NextResponse.json({ error: "Vavčer ni najden" }, { status: 404 });
    }

    return NextResponse.json(voucher);
  } catch (e) {
    console.error("GET /api/vouchers/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// PATCH /api/vouchers/[id]
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
        { error: "Samo admin lahko ureja vavčerje" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await db.voucher.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Vavčer ni najden" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowed = [
      "code", "name", "description", "type", "value", "minOrderValue",
      "maxDiscount", "usageLimit", "categories", "menuItemIds", "active", "note",
    ];
    for (const key of allowed) {
      if (key in body) updateData[key] = body[key];
    }
    if (body.validFrom) updateData.validFrom = new Date(body.validFrom);
    if (body.validUntil) updateData.validUntil = new Date(body.validUntil);

    const updated = await db.voucher.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/vouchers/[id] error:", e);
    return NextResponse.json({ error: "Napaka pri posodabljanju" }, { status: 500 });
  }
}

// DELETE /api/vouchers/[id]
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
        { error: "Samo admin lahko briše vavčerje" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await db.voucher.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Vavčer ni najden" }, { status: 404 });
    }

    await db.voucher.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/vouchers/[id] error:", e);
    return NextResponse.json({ error: "Napaka pri brisanju" }, { status: 500 });
  }
}
