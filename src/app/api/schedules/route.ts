import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/schedules?week=2024-01-01 (vrne razpored za teden)
export async function GET(req: NextRequest) {
  try {
    const weekStart = req.nextUrl.searchParams.get("week"); // YYYY-MM-DD (ponedeljek)
    const date = req.nextUrl.searchParams.get("date"); // specifičen dan

    const where: { date?: string } = {};
    if (date) {
      where.date = date;
    } else if (weekStart) {
      // Vrni vse od weekStart do +7 dni
      const start = new Date(weekStart);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const endStr = end.toISOString().slice(0, 10);

      const all = await db.schedule.findMany({
        where: {
          date: { gte: weekStart, lt: endStr },
        },
        include: { operator: true },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      });
      return NextResponse.json(all);
    }

    const schedules = await db.schedule.findMany({
      where,
      include: { operator: true },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });
    return NextResponse.json(schedules);
  } catch (e) {
    console.error("GET /api/schedules error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// POST /api/schedules — ustvari ali posodobi razpored
export async function POST(req: NextRequest) {
  try {
    const operator = await getOperatorFromRequest(req);
    if (!operator || operator.role !== "admin") {
      return NextResponse.json(
        { error: "Potrebna administratorska prijava" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { operatorId, date, startTime, endTime, role, note } = body as {
      operatorId: string;
      date: string;
      startTime: string;
      endTime: string;
      role?: string;
      note?: string;
    };

    if (!operatorId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (operatorId, date, startTime, endTime)" },
        { status: 400 }
      );
    }

    // upsert (unique [operatorId, date])
    const schedule = await db.schedule.upsert({
      where: {
        operatorId_date: { operatorId, date },
      },
      create: {
        operatorId,
        date,
        startTime,
        endTime,
        role: role || "waiter",
        note: note || null,
      },
      update: {
        startTime,
        endTime,
        role: role || "waiter",
        note: note || null,
      },
      include: { operator: true },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (e) {
    console.error("POST /api/schedules error:", e);
    return NextResponse.json({ error: "Napaka pri shranjevanju" }, { status: 500 });
  }
}
