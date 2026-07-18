import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/suppliers/[id] — vrne posameznega dobavitelja
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
    const supplier = await db.supplier.findFirst({
      where: { id, restaurantId: tenant.id },
    });

    if (!supplier) {
      return NextResponse.json({ error: "Dobavitelj ni najden" }, { status: 404 });
    }

    return NextResponse.json(supplier);
  } catch (e) {
    console.error("GET /api/suppliers/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// PATCH /api/suppliers/[id] — posodobi dobavitelja (samo admin)
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
        { error: "Samo admin lahko upravlja dobavitelje" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await db.supplier.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Dobavitelj ni najden" }, { status: 404 });
    }

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (typeof body.name === "string") updateData.name = body.name.trim();
    if (body.contactPerson !== undefined) {
      updateData.contactPerson =
        typeof body.contactPerson === "string" && body.contactPerson.trim()
          ? body.contactPerson.trim()
          : null;
    }
    if (body.phone !== undefined) {
      updateData.phone =
        typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
    }
    if (body.email !== undefined) {
      updateData.email =
        typeof body.email === "string" && body.email.trim() ? body.email.trim() : null;
    }
    if (body.address !== undefined) {
      updateData.address =
        typeof body.address === "string" && body.address.trim() ? body.address.trim() : null;
    }
    if (body.city !== undefined) {
      updateData.city =
        typeof body.city === "string" && body.city.trim() ? body.city.trim() : null;
    }
    if (body.taxNumber !== undefined) {
      updateData.taxNumber =
        typeof body.taxNumber === "string" && body.taxNumber.trim()
          ? body.taxNumber.trim()
          : null;
    }
    if (typeof body.paymentTerms === "string") {
      updateData.paymentTerms = body.paymentTerms;
    }
    if (typeof body.discountPercent === "number") {
      updateData.discountPercent = body.discountPercent;
    }
    if (body.note !== undefined) {
      updateData.note =
        typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
    }
    if (typeof body.active === "boolean") {
      updateData.active = body.active;
    }

    const updated = await db.supplier.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/suppliers/[id] error:", e);
    return NextResponse.json({ error: "Napaka pri posodobitvi" }, { status: 500 });
  }
}

// DELETE /api/suppliers/[id] — izbriše dobavitelja (samo admin)
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
        { error: "Samo admin lahko izbriše dobavitelja" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await db.supplier.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Dobavitelj ni najden" }, { status: 404 });
    }

    await db.supplier.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/suppliers/[id] error:", e);
    return NextResponse.json({ error: "Napaka pri brisanju" }, { status: 500 });
  }
}
