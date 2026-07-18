import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/cash-drawer/balance — vrne trenutno stanje gotovine + današnje KPI
// Vrne: { balance, todayIn, todayOut, todayCount }
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json(
        { error: "Restavracija ni najdena" },
        { status: 400 }
      );
    }

    // Celotno stanje = vsota vhodov - vsota izhodov
    const all = await db.cashDrawerEntry.findMany({
      where: { restaurantId: tenant.id },
      select: { direction: true, amount: true, createdAt: true },
    });

    let balance = 0;
    let todayIn = 0;
    let todayOut = 0;
    let todayCount = 0;

    const now = new Date();
    const dayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );
    const dayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );

    for (const e of all) {
      balance += e.direction === "in" ? e.amount : -e.amount;
      if (e.createdAt >= dayStart && e.createdAt <= dayEnd) {
        todayCount++;
        if (e.direction === "in") todayIn += e.amount;
        else todayOut += e.amount;
      }
    }

    return NextResponse.json({
      balance,
      todayIn,
      todayOut,
      todayCount,
    });
  } catch (e) {
    console.error("GET /api/cash-drawer/balance error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
