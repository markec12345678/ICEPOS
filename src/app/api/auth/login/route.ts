import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/auth/login — preveri PIN in vrne operaterja
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin } = body as { pin: string };

    if (!pin || pin.length !== 4) {
      return NextResponse.json(
        { error: "PIN mora biti 4-mesten" },
        { status: 400 }
      );
    }

    const operator = await db.operator.findFirst({
      where: { pin, active: true },
    });

    if (!operator) {
      return NextResponse.json(
        { error: "Napačen PIN" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: operator.id,
      name: operator.name,
      taxNumber: operator.taxNumber,
      role: operator.role,
      loginAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("POST /api/auth/login error:", e);
    return NextResponse.json({ error: "Napaka pri prijavi" }, { status: 500 });
  }
}
