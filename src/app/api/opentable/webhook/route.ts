import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getOpenTableConfig,
  verifyOpenTableWebhookSignature,
  mapOpenTableStatus,
  type OpenTableReservation,
} from "@/lib/opentable";

export const dynamic = "force-dynamic";

// POST /api/opentable/webhook — OpenTable pošlje rezervacije sem
// Event-i: reservation.created, reservation.updated, reservation.cancelled
export async function POST(req: NextRequest) {
  try {
    const config = getOpenTableConfig();
    if (!config) {
      return NextResponse.json(
        { error: "OpenTable ni konfiguriran" },
        { status: 503 }
      );
    }

    const body = await req.text();
    const signature = req.headers.get("x-opentable-signature") || "";

    if (!verifyOpenTableWebhookSignature(body, signature, config)) {
      console.error("[OpenTable webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(body) as {
      event: string;
      reservation: OpenTableReservation;
    };

    console.log(`[OpenTable webhook] Event: ${payload.event}, Reservation: ${payload.reservation.id}`);

    // Poišči restavracijo
    const restaurant = await db.restaurant.findFirst({ where: { active: true } });
    if (!restaurant) {
      return NextResponse.json({ ok: true });
    }

    const otRes = payload.reservation;
    const reservationDate = new Date(otRes.reservationDateTime).toISOString().slice(0, 10);
    const reservationTime = new Date(otRes.reservationDateTime).toTimeString().slice(0, 5);
    const customerName = `${otRes.customer.firstName} ${otRes.customer.lastName}`;

    // Poišči prosto mizo (na podlagi partySize)
    const tables = await db.table.findMany({
      where: { restaurantId: restaurant.id, seats: { gte: otRes.partySize } },
      orderBy: { seats: "asc" },
    });

    // Preveri konflikte za ta dan
    let assignedTableId: string | null = null;
    for (const table of tables) {
      const conflicts = await db.reservation.findMany({
        where: {
          tableId: table.id,
          date: reservationDate,
          status: { in: ["confirmed", "seated"] },
        },
      });

      const newStart = timeToMinutes(reservationTime);
      const newEnd = newStart + otRes.duration;

      const hasConflict = conflicts.some((r) => {
        const rStart = timeToMinutes(r.time);
        const rEnd = rStart + r.duration;
        return newStart < rEnd && newEnd > rStart;
      });

      if (!hasConflict) {
        assignedTableId = table.id;
        break;
      }
    }

    if (payload.event === "reservation.created" || payload.event === "reservation.updated") {
      // Upsert rezervacijo
      const existing = await db.reservation.findFirst({
        where: {
          tableId: assignedTableId || undefined,
          date: reservationDate,
          customerName,
        },
      });

      if (existing) {
        await db.reservation.update({
          where: { id: existing.id },
          data: {
            customerPhone: otRes.customer.phone,
            partySize: otRes.partySize,
            time: reservationTime,
            duration: otRes.duration,
            note: otRes.specialRequests || `OpenTable #${otRes.id}`,
            status: mapOpenTableStatus(otRes.status),
            tableId: assignedTableId || existing.tableId,
          },
        });
      } else {
        // Če ni mize, uporabi prvo mizo (bomo ročno dodelili)
        const fallbackTable = tables[0];
        await db.reservation.create({
          data: {
            restaurantId: restaurant.id,
            tableId: assignedTableId || fallbackTable?.id || "",
            customerName,
            customerPhone: otRes.customer.phone,
            partySize: otRes.partySize,
            date: reservationDate,
            time: reservationTime,
            duration: otRes.duration,
            note: otRes.specialRequests || `OpenTable #${otRes.id}`,
            status: mapOpenTableStatus(otRes.status),
          },
        });
      }

      console.log(`[OpenTable webhook] Reservation synced: ${customerName}, ${reservationDate} ${reservationTime}`);
    } else if (payload.event === "reservation.cancelled") {
      // Označi kot cancelled
      const existing = await db.reservation.findFirst({
        where: { date: reservationDate, customerName },
      });
      if (existing) {
        await db.reservation.update({
          where: { id: existing.id },
          data: { status: "cancelled" },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[OpenTable webhook] error:", e);
    return NextResponse.json({ ok: true });
  }
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map((x) => parseInt(x, 10));
  return h * 60 + m;
}
