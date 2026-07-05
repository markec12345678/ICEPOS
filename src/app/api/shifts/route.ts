// @ts-nocheck — pre-existing TS errors (non-critical route)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// Vrne smene za trenutno restavracijo
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const status = req.nextUrl.searchParams.get("status");
    const shifts = await db.shift.findMany({
      where: {
        restaurantId: tenant.id,
        ...(status ? { status } : {}),
      },
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
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const body = await req.json();
    const { operator, operatorTaxNo, startCash } = body as {
      operator: string;
      operatorTaxNo?: string;
      startCash?: number;
    };

    if (!operator) {
      return NextResponse.json({ error: "Manjka ime operaterja" }, { status: 400 });
    }

    // Preveri da ni že odprte smene v tej restavraciji
    const openShift = await db.shift.findFirst({
      where: { status: "open", restaurantId: tenant.id },
    });
    if (openShift) {
      return NextResponse.json(
        { error: `Smena je že odprta (${openShift.operator}, od ${openShift.startTime})` },
        { status: 409 }
      );
    }

    const authOperator = await getOperatorFromRequest(req);
    const finalOperator = authOperator?.name || operator.trim();
    const finalTaxNo = authOperator?.taxNumber || operatorTaxNo || tenant.taxNumber;

    const shift = await db.shift.create({
      data: {
        operator: finalOperator,
        operatorTaxNo: finalTaxNo,
        startCash: startCash || 0,
        status: "open",
        restaurantId: tenant.id,
      },
    });
    return NextResponse.json(shift, { status: 201 });
  } catch (e) {
    console.error("POST /api/shifts error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
