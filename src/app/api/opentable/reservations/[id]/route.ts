import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOpenTableConfig, updateReservationStatus, mapToOpenTableStatus } from "@/lib/opentable";

export const dynamic = "force-dynamic";

// POST /api/opentable/reservations/[id]/status — posodobi status rezervacije
// Body: { status: "confirmed" | "seated" | "no_show" | "cancelled" }
export async function POST(
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
    const status = body.status as "confirmed" | "seated" | "no_show" | "cancelled";

    // Posodobi lokalno
    const reservation = await db.reservation.findFirst({
      where: { id, restaurantId: tenant.id },
    });

    if (!reservation) {
      return NextResponse.json({ error: "Rezervacija ni najdena" }, { status: 404 });
    }

    await db.reservation.update({
      where: { id },
      data: { status },
    });

    // Posodobi v OpenTable (če je konfiguriran)
    const config = getOpenTableConfig();
    if (config) {
      // V produkciji: pošlji status update k OpenTable
      // Za POC: samo log
      console.log(`[OpenTable] Status update: ${id} → ${mapToOpenTableStatus(status)}`);
    }

    return NextResponse.json({ ok: true, message: `Status posodobljen: ${status}` });
  } catch (e) {
    console.error("POST /api/opentable/reservations/[id]/status error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
