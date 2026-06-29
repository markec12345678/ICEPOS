import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Posodobi inventarni izdelek (samo admin)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko upravlja zalogo" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof body.name === "string") data.name = body.name.trim();
    if (typeof body.unit === "string") data.unit = body.unit;
    if (typeof body.quantity === "number") data.quantity = body.quantity;
    if (typeof body.minQuantity === "number") data.minQuantity = body.minQuantity;
    if (typeof body.costPerUnit === "number") data.costPerUnit = body.costPerUnit;
    if (typeof body.supplier === "string") data.supplier = body.supplier || null;
    if (typeof body.category === "string") data.category = body.category;

    const updated = await db.inventoryItem.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/inventory/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// Izbriše inventarni izdelek (samo admin), preveri da ni v receptu
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko briše zalogo" },
        { status: 403 }
      );
    }

    // Preveri, ali je izdelek uporabljen v kakšnem receptu
    const recipeCount = await db.recipe.count({
      where: { inventoryItemId: id },
    });
    if (recipeCount > 0) {
      return NextResponse.json(
        {
          error: `Izdelek je uporabljen v ${recipeCount} receptih. Najprej odstrani povezave v receptih.`,
        },
        { status: 409 }
      );
    }

    await db.inventoryItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/inventory/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
