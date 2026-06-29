import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/timesheets/clock — hitri clock in/out za trenutnega operaterja
// Body: { action: "in" | "out" }
export async function POST(req: NextRequest) {
  try {
    const operator = await getOperatorFromRequest(req);
    if (!operator) {
      return NextResponse.json({ error: "Potrebna prijava" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body as { action: "in" | "out" };

    const today = new Date().toISOString().slice(0, 10);

    if (action === "in") {
      // Preveri ali že ima odprti timesheet
      const existing = await db.timesheet.findFirst({
        where: { operatorId: operator.id, clockOut: null },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Že ste prijavljeni (clock in že aktiven)", timesheet: existing },
          { status: 409 }
        );
      }

      const ts = await db.timesheet.create({
        data: {
          operatorId: operator.id,
          date: today,
          clockIn: new Date(),
        },
        include: { operator: true },
      });
      return NextResponse.json(ts, { status: 201 });
    } else if (action === "out") {
      const open = await db.timesheet.findFirst({
        where: { operatorId: operator.id, clockOut: null },
        orderBy: { clockIn: "desc" },
      });
      if (!open) {
        return NextResponse.json(
          { error: "Ni aktivnega clock in-a" },
          { status: 404 }
        );
      }
      const ts = await db.timesheet.update({
        where: { id: open.id },
        data: { clockOut: new Date() },
        include: { operator: true },
      });
      return NextResponse.json(ts);
    } else {
      return NextResponse.json(
        { error: 'Action mora biti "in" ali "out"' },
        { status: 400 }
      );
    }
  } catch (e) {
    console.error("POST /api/timesheets/clock error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// GET /api/timesheets/clock — vrne trenutni status operaterja
export async function GET(req: NextRequest) {
  try {
    const operator = await getOperatorFromRequest(req);
    if (!operator) {
      return NextResponse.json({ clockedIn: false });
    }

    const open = await db.timesheet.findFirst({
      where: { operatorId: operator.id, clockOut: null },
      orderBy: { clockIn: "desc" },
      include: { operator: true },
    });

    return NextResponse.json({
      clockedIn: !!open,
      timesheet: open,
      operator,
    });
  } catch (e) {
    console.error("GET /api/timesheets/clock error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
