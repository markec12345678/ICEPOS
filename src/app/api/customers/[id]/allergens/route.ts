import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/customers/[id]/allergens — pridobi alergene stranke
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
    const customer = await db.customer.findFirst({
      where: { id, restaurantId: tenant.id },
      select: { id: true, name: true, allergens: true },
    });

    if (!customer) {
      return NextResponse.json({ error: "Stranka ni najdena" }, { status: 404 });
    }

    let allergens: string[] = [];
    if (customer.allergens) {
      try {
        const parsed = JSON.parse(customer.allergens);
        if (Array.isArray(parsed)) allergens = parsed;
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      customerId: customer.id,
      customerName: customer.name,
      allergens,
    });
  } catch (e) {
    console.error("GET /api/customers/[id]/allergens error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// PATCH /api/customers/[id]/allergens — posodobi alergene stranke
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const { id } = await params;
    const body = await req.json();
    const { allergens } = body as { allergens: string[] };

    if (!Array.isArray(allergens)) {
      return NextResponse.json({ error: "Alergeni morajo biti array" }, { status: 400 });
    }

    const customer = await db.customer.findFirst({
      where: { id, restaurantId: tenant.id },
    });

    if (!customer) {
      return NextResponse.json({ error: "Stranka ni najdena" }, { status: 404 });
    }

    const updated = await db.customer.update({
      where: { id },
      data: { allergens: JSON.stringify(allergens) },
      select: { id: true, name: true, allergens: true },
    });

    return NextResponse.json({
      customerId: updated.id,
      customerName: updated.name,
      allergens,
      message: `Alergeni posodobljeni za ${updated.name}`,
    });
  } catch (e) {
    console.error("PATCH /api/customers/[id]/allergens error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
