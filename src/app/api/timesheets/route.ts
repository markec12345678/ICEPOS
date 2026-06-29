import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/timesheets?operatorId=...&date=...
export async function GET(req: NextRequest) {
  try {
    const operatorId = req.nextUrl.searchParams.get("operatorId");
    const date = req.nextUrl.searchParams.get("date");
    const open = req.nextUrl.searchParams.get("open"); // "true" = samo odprti (še dela)

    const where: { operatorId?: string; date?: string; clockOut?: null } = {};
    if (operatorId) where.operatorId = operatorId;
    if (date) where.date = date;
    if (open === "true") where.clockOut = null;

    const timesheets = await db.timesheet.findMany({
      where,
      include: { operator: true },
      orderBy: { clockIn: "desc" },
      take: 200,
    });
    return NextResponse.json(timesheets);
  } catch (e) {
    console.error("GET /api/timesheets error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// POST /api/timesheets — ročno kreiranje (admin)
export async function POST(req: NextRequest) {
  try {
    const operator = await getOperatorFromRequest(req);
    if (!operator) {
      return NextResponse.json(
        { error: "Potrebna prijava" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { operatorId, date, breakMinutes, note } = body as {
      operatorId: string;
      date?: string;
      breakMinutes?: number;
      note?: string;
    };

    if (!operatorId) {
      return NextResponse.json({ error: "operatorId manjka" }, { status: 400 });
    }

    const today = date || new Date().toISOString().slice(0, 10);

    const ts = await db.timesheet.create({
      data: {
        operatorId,
        date: today,
        clockIn: new Date(),
        breakMinutes: breakMinutes || 0,
        note: note || null,
      },
      include: { operator: true },
    });

    return NextResponse.json(ts, { status: 201 });
  } catch (e) {
    console.error("POST /api/timesheets error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// PATCH /api/timesheets — clock out
export async function PATCH(req: NextRequest) {
  try {
    const operator = await getOperatorFromRequest(req);
    if (!operator) {
      return NextResponse.json({ error: "Potrebna prijava" }, { status: 401 });
    }

    const body = await req.json();
    const { id, operatorId } = body as { id?: string; operatorId?: string };

    let ts;
    if (id) {
      ts = await db.timesheet.update({
        where: { id },
        data: { clockOut: new Date() },
        include: { operator: true },
      });
    } else if (operatorId) {
      // Poišči zadnji odprti timesheet za operaterja
      const open = await db.timesheet.findFirst({
        where: { operatorId, clockOut: null },
        orderBy: { clockIn: "desc" },
      });
      if (!open) {
        return NextResponse.json(
          { error: "Ni odprtega timesheeta za tega operaterja" },
          { status: 404 }
        );
      }
      ts = await db.timesheet.update({
        where: { id: open.id },
        data: { clockOut: new Date() },
        include: { operator: true },
      });
    } else {
      return NextResponse.json(
        { error: "Manjka id ali operatorId" },
        { status: 400 }
      );
    }

    return NextResponse.json(ts);
  } catch (e) {
    console.error("PATCH /api/timesheets error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
