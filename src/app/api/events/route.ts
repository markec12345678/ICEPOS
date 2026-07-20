import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/events — seznam dogodkov
// Podpora za ?status=&type=&from=&to=
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const status = req.nextUrl.searchParams.get("status");
    const type = req.nextUrl.searchParams.get("type");
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");

    const where: {
      restaurantId: string;
      status?: string;
      type?: string;
      eventDate?: { gte: Date; lte: Date };
    } = { restaurantId: tenant.id };

    if (status && status !== "all") where.status = status;
    if (type && type !== "all") where.type = type;

    const now = new Date();
    if (from) {
      where.eventDate = { gte: new Date(from + "T00:00:00"), ...(where.eventDate || {}) };
    }
    if (to) {
      where.eventDate = { lte: new Date(to + "T23:59:59"), ...(where.eventDate || {}) };
    }

    const events = await db.event.findMany({
      where,
      orderBy: { eventDate: "asc" },
    });

    const now2 = new Date();
    const summary = {
      total: events.length,
      upcoming: events.filter((e) => e.eventDate > now2 && e.status !== "cancelled").length,
      confirmed: events.filter((e) => e.status === "confirmed" || e.status === "deposit").length,
      completed: events.filter((e) => e.status === "completed").length,
      cancelled: events.filter((e) => e.status === "cancelled").length,
      totalGuests: events
        .filter((e) => e.status !== "cancelled")
        .reduce((s, e) => s + e.guestCount, 0),
      totalRevenue: events
        .filter((e) => e.status === "completed")
        .reduce((s, e) => s + e.totalQuoted, 0),
      pendingDeposits: events
        .filter((e) => e.status === "confirmed")
        .reduce((s, e) => s + (e.totalQuoted - e.depositPaid), 0),
    };

    return NextResponse.json({
      events: events.map((e) => ({
        ...e,
        eventDate: e.eventDate.toISOString(),
        endDate: e.endDate?.toISOString() || null,
        createdAt: e.createdAt.toISOString(),
        balance: e.totalQuoted - e.depositPaid,
      })),
      summary,
    });
  } catch (e) {
    console.error("GET /api/events error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju dogodkov" }, { status: 500 });
  }
}

// POST /api/events — ustvari nov dogodek
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp) {
      return NextResponse.json({ error: "Potrebna je prijava" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      type,
      customerName,
      customerPhone,
      customerEmail,
      eventDate,
      endDate,
      setupTime,
      guestCount,
      location,
      isOffsite,
      offsiteAddress,
      packagePrice,
      pricePerGuest,
      totalQuoted,
      depositPaid,
      status,
      menu,
      requirements,
      note,
      assignedOperator,
    } = body as {
      title: string;
      type: string;
      customerName: string;
      customerPhone?: string;
      customerEmail?: string;
      eventDate: string;
      endDate?: string;
      setupTime?: string;
      guestCount?: number;
      location?: string;
      isOffsite?: boolean;
      offsiteAddress?: string;
      packagePrice?: number;
      pricePerGuest?: number;
      totalQuoted?: number;
      depositPaid?: number;
      status?: string;
      menu?: string;
      requirements?: string;
      note?: string;
      assignedOperator?: string;
    };

    if (!title || !type || !customerName || !eventDate) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (title, type, customerName, eventDate)" },
        { status: 400 }
      );
    }

    // Auto-izračun totalQuoted če ni podan
    let calculatedTotal = totalQuoted;
    if (calculatedTotal === undefined) {
      const guests = guestCount || 0;
      calculatedTotal = (packagePrice || 0) + guests * (pricePerGuest || 0);
    }

    const event = await db.event.create({
      data: {
        restaurantId: tenant.id,
        title,
        type,
        customerName,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        eventDate: new Date(eventDate),
        endDate: endDate ? new Date(endDate) : null,
        setupTime: setupTime || null,
        guestCount: guestCount || 0,
        location: location || null,
        isOffsite: isOffsite || false,
        offsiteAddress: offsiteAddress || null,
        packagePrice: packagePrice || 0,
        pricePerGuest: pricePerGuest || 0,
        totalQuoted: calculatedTotal,
        depositPaid: depositPaid || 0,
        status: status || "inquiry",
        menu: menu || null,
        requirements: requirements || null,
        note: note || null,
        assignedOperator: assignedOperator || authOp.name,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (e) {
    console.error("POST /api/events error:", e);
    return NextResponse.json({ error: "Napaka pri ustvarjanju dogodka" }, { status: 500 });
  }
}
