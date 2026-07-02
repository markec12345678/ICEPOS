import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/waitlist — vsi vnosi v čakalni vrsti
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const status = req.nextUrl.searchParams.get("status") || "waiting";

    const entries = await db.waitlistEntry.findMany({
      where: {
        restaurantId: tenant.id,
        ...(status !== "all" && { status }),
      },
      orderBy: { createdAt: "asc" },
    });

    // Dodaj elapsed time (koliko časa čaka)
    const now = new Date();
    const withElapsed = entries.map((e) => ({
      ...e,
      elapsedMinutes: e.status === "waiting"
        ? Math.floor((now.getTime() - e.createdAt.getTime()) / 60000)
        : 0,
    }));

    return NextResponse.json(withElapsed);
  } catch (e) {
    console.error("GET /api/waitlist error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// POST /api/waitlist — dodaj nov vnos v čakalno vrsto
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const body = await req.json();
    const { customerName, phone, partySize, estimatedWait, note } = body as {
      customerName: string;
      phone?: string;
      partySize?: number;
      estimatedWait?: number;
      note?: string;
    };

    if (!customerName || !customerName.trim()) {
      return NextResponse.json({ error: "Ime stranke je obvezno" }, { status: 400 });
    }

    const entry = await db.waitlistEntry.create({
      data: {
        restaurantId: tenant.id,
        customerName: customerName.trim(),
        phone: phone?.trim() || null,
        partySize: partySize || 2,
        estimatedWait: estimatedWait || null,
        note: note?.trim() || null,
        status: "waiting",
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    console.error("POST /api/waitlist error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
