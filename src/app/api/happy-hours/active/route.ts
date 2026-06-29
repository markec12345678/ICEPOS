import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getActiveHappyHours } from "@/lib/happy-hour";

export const dynamic = "force-dynamic";

// GET /api/happy-hours/active — vrne trenutno aktivne happy hour pravila
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const active = await getActiveHappyHours(tenant.id);

    // Pridobi tudi polne podatke (z categories filter)
    const full = await Promise.all(
      active.map(async (hh) => {
        const full = await db.happyHour.findUnique({ where: { id: hh.id } });
        return {
          ...hh,
          categories: full?.categories || "all",
          menuItemIds: full?.menuItemIds || "all",
        };
      })
    );

    return NextResponse.json({
      active: full,
      now: new Date().toISOString(),
    });
  } catch (e) {
    console.error("GET /api/happy-hours/active error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
