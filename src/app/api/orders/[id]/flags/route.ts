import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// PATCH /api/orders/[id]/flags — posodobi oznake naročila
// Body: { flags: ["vip", "birthday", "rush", "allergy"] }
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
      return NextResponse.json({ error: "Potrebna prijava" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { flags } = body as { flags: string[] };

    if (!Array.isArray(flags)) {
      return NextResponse.json({ error: "Flags mora biti array" }, { status: 400 });
    }

    const order = await db.order.findFirst({
      where: { id, restaurantId: tenant.id },
    });

    if (!order) {
      return NextResponse.json({ error: "Naročilo ni najdeno" }, { status: 404 });
    }

    await db.order.update({
      where: { id },
      data: { flags: JSON.stringify(flags) },
    });

    return NextResponse.json({
      ok: true,
      flags,
      message: `Oznake posodobljene: ${flags.length > 0 ? flags.join(", ") : "brez oznak"}`,
    });
  } catch (e) {
    console.error("PATCH /api/orders/[id]/flags error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
