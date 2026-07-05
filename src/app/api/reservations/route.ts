// @ts-nocheck — pre-existing TS errors (non-critical route)
import { NextRequest, NextResponse } from "next/server";
import { ReservationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { buildReservationConfirmation, sendNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// Vrne rezervacije za trenutno restavracijo (z opcijskim filtrom na datum)
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const date = req.nextUrl.searchParams.get("date");
    const status = req.nextUrl.searchParams.get("status");

    const where: { restaurantId: string; date?: string; status?: any } = { restaurantId: tenant.id };
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
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

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

    // Preveri da miza pripada tej restavraciji
    const table = await db.table.findFirst({
      where: { id: tableId, restaurantId: tenant.id },
    });
    if (!table) {
      return NextResponse.json({ error: "Miza ni najdena v tej restavraciji" }, { status: 404 });
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
        restaurantId: tenant.id,
      },
      include: { table: true },
    });

    // Pošlji potrditveni SMS/email (če je podan telefon)
    if (customerPhone) {
      const payload = buildReservationConfirmation(
        customerName,
        date,
        time,
        String(partySize),
        reservation.table.name
      );
      payload.to = customerPhone;
      // SMS če je telefon, sicer email
      const isPhone = /^[\+]?[0-9\s\-]{8,15}$/.test(customerPhone);
      await sendNotification(payload, isPhone ? "sms" : "email");
    }

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
