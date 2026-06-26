import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/auth/me — vrne operaterja glede na PIN v header-ju
export async function GET(req: NextRequest) {
  try {
    const pin = req.headers.get("x-operator-pin");
    if (!pin) {
      return NextResponse.json({ operator: null });
    }

    const operator = await db.operator.findFirst({
      where: { pin, active: true },
    });

    if (!operator) {
      return NextResponse.json({ operator: null });
    }

    return NextResponse.json({
      operator: {
        id: operator.id,
        name: operator.name,
        taxNumber: operator.taxNumber,
        role: operator.role,
      },
    });
  } catch (e) {
    console.error("GET /api/auth/me error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
