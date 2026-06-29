import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// DELETE /api/schedules/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const operator = await getOperatorFromRequest(req);
    if (!operator || operator.role !== "admin") {
      return NextResponse.json(
        { error: "Potrebna administratorska prijava" },
        { status: 403 }
      );
    }

    const { id } = await params;
    await db.schedule.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/schedules/[id] error:", e);
    return NextResponse.json({ error: "Napaka pri brisanju" }, { status: 500 });
  }
}
