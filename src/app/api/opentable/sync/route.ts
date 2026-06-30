import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOpenTableConfig, fetchReservations } from "@/lib/opentable";

export const dynamic = "force-dynamic";

// POST /api/opentable/sync — ročno sinhroniziraj rezervacije iz OpenTable
// Body: { date: "2025-01-15" } (default: danes)
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const config = getOpenTableConfig();
    if (!config) {
      return NextResponse.json(
        { error: "OpenTable ni konfiguriran" },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const date = body.date || new Date().toISOString().slice(0, 10);

    const otReservations = await fetchReservations(date, config);

    if (otReservations.length === 0) {
      return NextResponse.json({
        synced: 0,
        message: "Ni rezervacij na OpenTable za ta dan",
      });
    }

    let synced = 0;
    for (const otRes of otReservations) {
      const reservationDate = new Date(otRes.reservationDateTime).toISOString().slice(0, 10);
      const reservationTime = new Date(otRes.reservationDateTime).toTimeString().slice(0, 5);
      const customerName = `${otRes.customer.firstName} ${otRes.customer.lastName}`;

      // Poišči ali ustvari rezervacijo
      const existing = await db.reservation.findFirst({
        where: {
          date: reservationDate,
          customerName,
          restaurantId: tenant.id,
        },
      });

      if (existing) {
        // Update
        await db.reservation.update({
          where: { id: existing.id },
          data: {
            customerPhone: otRes.customer.phone,
            partySize: otRes.partySize,
            time: reservationTime,
            duration: otRes.duration,
            note: otRes.specialRequests || `OpenTable #${otRes.id}`,
          },
        });
      } else {
        // Poišči prosto mizo
        const tables = await db.table.findMany({
          where: { restaurantId: tenant.id, seats: { gte: otRes.partySize } },
          orderBy: { seats: "asc" },
        });
        const table = tables[0]; // prva ki ustreza

        if (table) {
          await db.reservation.create({
            data: {
              restaurantId: tenant.id,
              tableId: table.id,
              customerName,
              customerPhone: otRes.customer.phone,
              partySize: otRes.partySize,
              date: reservationDate,
              time: reservationTime,
              duration: otRes.duration,
              note: otRes.specialRequests || `OpenTable #${otRes.id}`,
              status: "confirmed",
            },
          });
        }
      }
      synced++;
    }

    return NextResponse.json({
      synced,
      total: otReservations.length,
      date,
      message: `Sinhroniziranih ${synced} rezervacij iz OpenTable`,
    });
  } catch (e) {
    console.error("POST /api/opentable/sync error:", e);
    return NextResponse.json({ error: "Napaka pri sinhronizaciji" }, { status: 500 });
  }
}
