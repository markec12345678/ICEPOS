// @ts-nocheck — pre-existing TS errors (non-critical route)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/labor-cost?date=2024-01-01 (danes privzeto)
// Vrne: skupne ure, skupni strošek dela, promet, labor cost %
export async function GET(req: NextRequest) {
  try {
    const dateParam = req.nextUrl.searchParams.get("date");
    const date = dateParam || new Date().toISOString().slice(0, 10);

    // Vsi timesheet-i za ta dan
    const timesheets = await db.timesheet.findMany({
      where: { date },
      include: { operator: true },
    });

    let totalMinutes = 0;
    let totalCost = 0;
    const perOperator: {
      operatorId: string;
      operatorName: string;
      hourlyRate: number;
      minutes: number;
      cost: number;
      clockIn: string;
      clockOut: string | null;
    }[] = [];

    for (const ts of timesheets) {
      const end = ts.clockOut || new Date();
      const minutes = Math.max(0, Math.floor((end.getTime() - ts.clockIn.getTime()) / 60000));
      const effectiveMinutes = Math.max(0, minutes - ts.breakMinutes);
      const hours = effectiveMinutes / 60;
      const cost = hours * Number(ts.operator.hourlyRate);

      totalMinutes += effectiveMinutes;
      totalCost += cost;

      perOperator.push({
        operatorId: ts.operatorId,
        operatorName: ts.operator.name,
        hourlyRate: ts.operator.hourlyRate,
        minutes: effectiveMinutes,
        cost,
        clockIn: ts.clockIn.toISOString(),
        clockOut: ts.clockOut?.toISOString() || null,
      });
    }

    // Promet za ta dan
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const paidOrders = await db.order.findMany({
      where: {
        status: "paid",
        paidAt: { gte: dayStart, lte: dayEnd },
      },
      select: { total: true, tip: true },
    });

    const revenue = paidOrders.reduce((s, o) => s + Number(o.total), 0);
    const tips = paidOrders.reduce((s, o) => s + (Number(o.tip) || 0), 0);
    const laborCostPercent = revenue > 0 ? (totalCost / revenue) * 100 : 0;

    return NextResponse.json({
      date,
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      revenue: Math.round(revenue * 100) / 100,
      tips: Math.round(tips * 100) / 100,
      laborCostPercent: Math.round(laborCostPercent * 10) / 10,
      activeEmployees: timesheets.filter((t) => !t.clockOut).length,
      totalEmployees: timesheets.length,
      perOperator,
    });
  } catch (e) {
    console.error("GET /api/labor-cost error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
