import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/currency-rates/[id]
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
    const rate = await db.currencyRate.findFirst({
      where: { id, restaurantId: tenant.id },
    });

    if (!rate) {
      return NextResponse.json({ error: "Tečaj ni najden" }, { status: 404 });
    }

    return NextResponse.json(rate);
  } catch (e) {
    console.error("GET /api/currency-rates/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// PATCH /api/currency-rates/[id]
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
        { error: "Samo admin lahko ureja tečaje" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await db.currencyRate.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tečaj ni najden" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { lastUpdated: new Date() };
    const allowed = ["currency", "symbol", "rate", "buyRate", "sellRate", "active", "note"];
    for (const key of allowed) {
      if (key in body) updateData[key] = body[key];
    }

    const updated = await db.currencyRate.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/currency-rates/[id] error:", e);
    return NextResponse.json({ error: "Napaka pri posodabljanju" }, { status: 500 });
  }
}

// DELETE /api/currency-rates/[id]
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
        { error: "Samo admin lahko briše tečaje" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await db.currencyRate.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tečaj ni najden" }, { status: 404 });
    }

    await db.currencyRate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/currency-rates/[id] error:", e);
    return NextResponse.json({ error: "Napaka pri brisanju" }, { status: 500 });
  }
}
