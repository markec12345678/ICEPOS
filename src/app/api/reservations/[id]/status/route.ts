import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// PATCH /api/reservations/[id]/status — posodobi status rezervacije
// Body: { status: "confirmed" | "seated" | "cancelled" | "no_show" }
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
    const { status } = body as { status: string };

    const validStatuses = ["confirmed", "seated", "cancelled", "no_show"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Neveljaven status" }, { status: 400 });
    }

    const reservation = await db.reservation.findFirst({
      where: { id, restaurantId: tenant.id },
    });

    if (!reservation) {
      return NextResponse.json({ error: "Rezervacija ni najdena" }, { status: 404 });
    }

    const updated = await db.reservation.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/reservations/[id]/status error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
