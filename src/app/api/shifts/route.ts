import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Vrne smene (z opcijskim filtrom na status)
export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status");
    const shifts = await db.shift.findMany({
      where: status ? { status } : {},
      orderBy: { startTime: "desc" },
      take: 50,
    });
    return NextResponse.json(shifts);
  } catch (e) {
    console.error("GET /api/shifts error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// Začne novo smeno
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { operator, operatorTaxNo, startCash } = body as {
      operator: string;
      operatorTaxNo?: string;
      startCash?: number;
    };

    if (!operator) {
      return NextResponse.json({ error: "Manjka ime operaterja" }, { status: 400 });
    }

    // Preveri da ni že odprte smene
    const openShift = await db.shift.findFirst({ where: { status: "open" } });
    if (openShift) {
      return NextResponse.json(
        { error: `Smena je že odprta (${openShift.operator}, od ${openShift.startTime})` },
        { status: 409 }
      );
    }

    const shift = await db.shift.create({
      data: {
        operator: operator.trim(),
        operatorTaxNo: operatorTaxNo || "SI12345678",
        startCash: startCash || 0,
        status: "open",
      },
    });
    return NextResponse.json(shift, { status: 201 });
  } catch (e) {
    console.error("POST /api/shifts error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
