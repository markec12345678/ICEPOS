import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Izbriše recept (samo admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko briše recepte" },
        { status: 403 }
      );
    }

    await db.recipe.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/recipes/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
