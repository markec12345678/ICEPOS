import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// Podrobnosti stranke z zadnjimi 20 naročili (z items.menuItem)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            items: {
              include: { menuItem: true },
            },
            table: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Stranka ni najdena" },
        { status: 404 }
      );
    }
    return NextResponse.json(customer);
  } catch (e) {
    console.error("GET /api/customers/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// Posodobi stranko
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (typeof body.name === "string") data.name = body.name.trim();
    if (typeof body.phone === "string") {
      const phone = body.phone.trim();
      if (phone) {
        // Preveri unikatnost (razen trenutne stranke)
        const existing = await db.customer.findFirst({
          where: { phone, NOT: { id } },
        });
        if (existing) {
          return NextResponse.json(
            { error: "Telefonska številka je že v uporabi" },
            { status: 409 }
          );
        }
      }
      data.phone = phone || null;
    }
    if (typeof body.email === "string") data.email = body.email.trim() || null;
    if (typeof body.note === "string") data.note = body.note.trim() || null;
    if (typeof body.points === "number") data.points = body.points;
    if (typeof body.allergens === "string") data.allergens = body.allergens || null;

    const updated = await db.customer.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/customers/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// Izbriše stranko (naročila ostanejo, customerId se nastavi na null)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Najprej odveži naročila od stranke (prepreči foreign key napako)
    await db.order.updateMany({
      where: { customerId: id },
      data: { customerId: null },
    });

    await db.customer.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/customers/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
