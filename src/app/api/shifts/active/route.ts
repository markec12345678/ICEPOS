import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// Vrne aktivno (odprto) smeno za trenutno restavracijo
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const shift = await db.shift.findFirst({
      where: { status: "open", restaurantId: tenant.id },
      orderBy: { startTime: "desc" },
    });
    return NextResponse.json(shift);
  } catch (e) {
    console.error("GET /api/shifts/active error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
