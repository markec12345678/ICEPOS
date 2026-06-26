import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";

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

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof body.name === "string") data.name = body.name;
    if (typeof body.pin === "string" && body.pin.length === 4) {
      // Preveri unikatnost PIN-a
      const existing = await db.operator.findFirst({
        where: { pin: body.pin, NOT: { id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "PIN je že v uporabi" },
          { status: 409 }
        );
      }
      data.pin = body.pin;
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
