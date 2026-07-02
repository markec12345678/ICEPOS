import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// PATCH /api/waitlist/[id] — posodobi status vnosa (seated, left, notified)
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
    const { status, tableId, notified, estimatedWait } = body as {
      status?: string;
      tableId?: string;
      notified?: boolean;
      estimatedWait?: number;
    };

    const entry = await db.waitlistEntry.findFirst({
      where: { id, restaurantId: tenant.id },
    });

    if (!entry) {
      return NextResponse.json({ error: "Vnos ni najden" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status;
      if (status === "seated") {
        updateData.seatedAt = new Date();
        if (tableId) updateData.tableId = tableId;
      }
      if (status === "left" || status === "cancelled") {
        updateData.leftAt = new Date();
      }
    }
    if (notified !== undefined) {
      updateData.notified = notified;
      if (notified) updateData.notifiedAt = new Date();
    }
    if (estimatedWait !== undefined) {
      updateData.estimatedWait = estimatedWait;
    }

    const updated = await db.waitlistEntry.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/waitlist/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// DELETE /api/waitlist/[id] — izbriši vnos
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const { id } = await params;
    const entry = await db.waitlistEntry.findFirst({
      where: { id, restaurantId: tenant.id },
    });

    if (!entry) {
      return NextResponse.json({ error: "Vnos ni najden" }, { status: 404 });
    }

    await db.waitlistEntry.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/waitlist/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
