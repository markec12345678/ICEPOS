import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Vrne aktivno (odprto) smeno
export async function GET() {
  try {
    const shift = await db.shift.findFirst({
      where: { status: "open" },
      orderBy: { startTime: "desc" },
    });
    return NextResponse.json(shift);
  } catch (e) {
    console.error("GET /api/shifts/active error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
