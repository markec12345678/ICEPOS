import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/customers/birthdays?days=7 — stranke z rojstnimi dnevi v naslednjih X dneh
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const days = parseInt(req.nextUrl.searchParams.get("days") || "30", 10);

    const customers = await db.customer.findMany({
      where: {
        restaurantId: tenant.id,
        birthday: { not: null },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        birthday: true,
        totalSpent: true,
        visitCount: true,
        points: true,
      },
    });

    const now = new Date();
    const currentYear = now.getFullYear();

    // Izračunaj naslednji rojstni dan za vsako stranko
    const withUpcoming = customers
      .map((c) => {
        if (!c.birthday) return null;
        const bd = new Date(c.birthday);
        // Naslednji rojstni dan (letos ali lansko)
        let nextBd = new Date(currentYear, bd.getMonth(), bd.getDate());
        if (nextBd < now) {
          nextBd = new Date(currentYear + 1, bd.getMonth(), bd.getDate());
        }
        const daysUntil = Math.ceil((nextBd.getTime() - now.getTime()) / 86400000);
        const age = nextBd.getFullYear() - bd.getFullYear();
        const isToday = daysUntil === 0;
        const isTomorrow = daysUntil === 1;
        return {
          ...c,
          birthday: c.birthday.toISOString(),
          nextBirthday: nextBd.toISOString(),
          daysUntil,
          age,
          isToday,
          isTomorrow,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .filter((c) => c.daysUntil <= days)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    // Statistika
    const today = withUpcoming.filter((c) => c.isToday);
    const thisWeek = withUpcoming.filter((c) => c.daysUntil <= 7);
    const thisMonth = withUpcoming.filter((c) => c.daysUntil <= 30);

    return NextResponse.json({
      birthdays: withUpcoming,
      summary: {
        today: today.length,
        thisWeek: thisWeek.length,
        thisMonth: thisMonth.length,
        total: withUpcoming.length,
      },
      days,
    });
  } catch (e) {
    console.error("GET /api/customers/birthdays error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
