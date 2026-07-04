import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";
import { hashPin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko upravlja operaterje" },
        { status: 403 }
      );
    }

    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant ni najden" }, { status: 400 });
    }

    // Tenant-scoped lookup — preprečuje cross-tenant IDOR
    const existing_op = await db.operator.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!existing_op) {
      return NextResponse.json({ error: "Operater ni najden" }, { status: 404 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof body.name === "string") data.name = body.name;
    if (typeof body.pin === "string" && body.pin.length >= 4 && body.pin.length <= 8) {
      // Preveri unikatnost PIN-a (per-tenant)
      const all_ops = await db.operator.findMany({
        where: { restaurantId: tenant.id, NOT: { id } },
      });
      for (const op of all_ops) {
        if (verifyPin(body.pin, op.pin)) {
          return NextResponse.json(
            { error: "PIN je že v uporabi" },
            { status: 409 }
          );
        }
      }
      data.pin = hashPin(body.pin); // hash PIN pred shranjevanjem
    }
    if (typeof body.taxNumber === "string") data.taxNumber = body.taxNumber;
    if (typeof body.role === "string") data.role = body.role;
    if (typeof body.active === "boolean") data.active = body.active;

    const updated = await db.operator.update({ where: { id }, data });
    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      taxNumber: updated.taxNumber,
      role: updated.role,
      active: updated.active,
    });
  } catch (e) {
    console.error("PATCH /api/operators/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko briše operaterje" },
        { status: 403 }
      );
    }

    // Ne dovoli brisanja samega sebe
    if (authOp.id === id) {
      return NextResponse.json(
        { error: "Ne moreš izbrisati samega sebe" },
        { status: 400 }
      );
    }

    await db.operator.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/operators/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
