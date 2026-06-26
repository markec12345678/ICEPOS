import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Vrne rezervacije (z opcijskim filtrom na datum)
export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get("date");
    const status = req.nextUrl.searchParams.get("status");

    const where: { date?: string; status?: string } = {};
    if (date) where.date = date;
    if (status) where.status = status;

    const reservations = await db.reservation.findMany({
      where,
      include: { table: true },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });
    return NextResponse.json(reservations);
  } catch (e) {
    console.error("GET /api/reservations error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// Ustvari novo rezervacijo
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tableId, customerName, customerPhone, partySize, date, time, duration, note } = body as {
      tableId: string;
      customerName: string;
      customerPhone?: string;
      partySize: number;
      date: string;
      time: string;
      duration?: number;
      note?: string;
    };

    if (!tableId || !customerName || !partySize || !date || !time) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (tableId, customerName, partySize, date, time)" },
        { status: 400 }
      );
    }

    // Preveri konflikte (ista miza, isti dan, prekrivajoč čas)
    const existing = await db.reservation.findMany({
      where: { tableId, date, status: { in: ["confirmed", "seated"] } },
    });
    const newStart = parseTimeToMinutes(time);
    const newEnd = newStart + (duration || 120);
    for (const r of existing) {
      const rStart = parseTimeToMinutes(r.time);
      const rEnd = rStart + r.duration;
      if (newStart < rEnd && newEnd > rStart) {
        return NextResponse.json(
          { error: `Miza je že rezervirana v tem času (${r.time}, ${r.duration}min)` },
          { status: 409 }
        );
      }
    }

    const reservation = await db.reservation.create({
      data: {
        tableId,
        customerName: customerName.trim(),
        customerPhone: customerPhone?.trim() || null,
        partySize: parseInt(partySize, 10),
        date,
        time,
        duration: duration || 120,
        note: note?.trim() || null,
        status: "confirmed",
      },
      include: { table: true },
    });
    return NextResponse.json(reservation, { status: 201 });
  } catch (e) {
    console.error("POST /api/reservations error:", e);
    return NextResponse.json({ error: "Napaka pri ustvarjanju rezervacije" }, { status: 500 });
  }
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map((x) => parseInt(x, 10));
  return h * 60 + m;
}
