import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/energy — seznam obrisov porabe
// Podpora za ?type=&from=&to=
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const type = req.nextUrl.searchParams.get("type");
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");

    const now = new Date();
    const startDate = from ? new Date(from + "T00:00:00") : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to + "T23:59:59") : now;

    const where: {
      restaurantId: string;
      type?: string;
      readingDate?: { gte: Date; lte: Date };
    } = {
      restaurantId: tenant.id,
      readingDate: { gte: startDate, lte: endDate },
    };
    if (type && type !== "all") {
      where.type = type;
    }

    const readings = await db.energyReading.findMany({
      where,
      orderBy: { readingDate: "desc" },
      take: 500,
    });

    // Agregacija po tipih
    const byType = new Map<
      string,
      { type: string; totalValue: number; totalCost: number; count: number; avgCostPerUnit: number }
    >();

    for (const r of readings) {
      const existing = byType.get(r.type);
      if (existing) {
        existing.totalValue += r.value;
        existing.totalCost += r.cost;
        existing.count++;
      } else {
        byType.set(r.type, {
          type: r.type,
          totalValue: r.value,
          totalCost: r.cost,
          count: 1,
          avgCostPerUnit: 0,
        });
      }
    }

    // Izračunaj povprečno ceno na enoto
    for (const v of byType.values()) {
      v.avgCostPerUnit = v.totalValue > 0 ? v.totalCost / v.totalValue : 0;
    }

    // Mesečna agregacija (za graf)
    const monthlyMap = new Map<
      string,
      { month: string; electricity: number; gas: number; water: number; heating: number; totalCost: number }
    >();

    for (const r of readings) {
      const monthKey = r.readingDate.toISOString().slice(0, 7); // YYYY-MM
      const existing = monthlyMap.get(monthKey);
      if (existing) {
        if (r.type === "electricity") existing.electricity += r.value;
        if (r.type === "gas") existing.gas += r.value;
        if (r.type === "water") existing.water += r.value;
        if (r.type === "heating") existing.heating += r.value;
        existing.totalCost += r.cost;
      } else {
        monthlyMap.set(monthKey, {
          month: monthKey,
          electricity: r.type === "electricity" ? r.value : 0,
          gas: r.type === "gas" ? r.value : 0,
          water: r.type === "water" ? r.value : 0,
          heating: r.type === "heating" ? r.value : 0,
          totalCost: r.cost,
        });
      }
    }

    const summary = {
      totalReadings: readings.length,
      totalCost: readings.reduce((s, r) => s + r.cost, 0),
      totalValue: readings.reduce((s, r) => s + r.value, 0),
      byType: Array.from(byType.values()),
      monthly: Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
      types: ["electricity", "gas", "water", "heating"],
    };

    return NextResponse.json({
      readings: readings.map((r) => ({
        ...r,
        readingDate: r.readingDate.toISOString(),
        createdAt: r.createdAt.toISOString(),
      })),
      summary,
    });
  } catch (e) {
    console.error("GET /api/energy error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju obrisov porabe" }, { status: 500 });
  }
}

// POST /api/energy — dodaj nov obris
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko dodaja obrisе porabe" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { type, readingDate, value, unit, cost, meterNumber, note } = body as {
      type: string;
      readingDate?: string;
      value: number;
      unit?: string;
      cost?: number;
      meterNumber?: string;
      note?: string;
    };

    if (!type || typeof value !== "number" || value <= 0) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (type, value)" },
        { status: 400 }
      );
    }

    const validTypes = ["electricity", "gas", "water", "heating"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Neveljaven tip" }, { status: 400 });
    }

    const costPerUnit = cost && value > 0 ? cost / value : 0;

    const reading = await db.energyReading.create({
      data: {
        restaurantId: tenant.id,
        type,
        readingDate: readingDate ? new Date(readingDate) : new Date(),
        value,
        unit: unit || (type === "water" ? "m³" : "kWh"),
        cost: cost || 0,
        costPerUnit,
        meterNumber: meterNumber || null,
        note: note || null,
      },
    });

    return NextResponse.json(reading, { status: 201 });
  } catch (e) {
    console.error("POST /api/energy error:", e);
    return NextResponse.json({ error: "Napaka pri dodajanju obrisa" }, { status: 500 });
  }
}
