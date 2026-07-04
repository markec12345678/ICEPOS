import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { verifyPin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/auth/me — vrne operaterja glede na PIN v header-ju
// Uporablja verifyPin() za preverjanje hashed PIN-a.
export async function GET(req: NextRequest) {
  try {
    const pin = req.headers.get("x-operator-pin");
    if (!pin) {
      return NextResponse.json({ error: "Ni prijavljen" }, { status: 401 });
    }

    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant ni najden" }, { status: 400 });
    }

    // PIN je hashed — ne moremo query-ati direktno. Naložimo vse aktivne
    // operaterje za tenant in preverimo z verifyPin().
    const operators = await db.operator.findMany({
      where: { restaurantId: tenant.id, active: true },
    });

    let operator = null;
    for (const op of operators) {
      if (verifyPin(pin, op.pin)) {
        operator = op;
        break;
      }
    }

    if (!operator) {
      return NextResponse.json({ error: "Ni prijavljen" }, { status: 401 });
    }

    return NextResponse.json({
      operator: {
        id: operator.id,
        name: operator.name,
        taxNumber: tenant.taxNumber,
        role: operator.role,
        restaurantId: tenant.id,
        restaurantName: tenant.name,
      },
    });
  } catch (e) {
    console.error("GET /api/auth/me error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
