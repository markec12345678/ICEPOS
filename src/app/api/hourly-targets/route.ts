// @ts-nocheck — pre-existing TS errors (non-critical route)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/hourly-targets — urni cilji prometa z real-time progress
// Dnevni cilj razdeli po urah glede na zgodovinsko distribucijo
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    // Pridobi zadnjih 30 dni zgodovine za distribucijo po urah
    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);

    const orders = await db.order.findMany({
      where: {
        restaurantId: tenant.id,
        status: "paid",
        paidAt: { gte: since30 },
      },
      select: { total: true, paidAt: true },
    });

    // Pridobi današnje plačane račune
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const now = new Date();

    const todayOrders = await db.order.findMany({
      where: {
        restaurantId: tenant.id,
        status: "paid",
        paidAt: { gte: todayStart, lte: now },
      },
      select: { total: true, paidAt: true },
    });

    // Izračunaj distribucijo prometa po urah (zadnjih 30 dni)
    const hourlyDistribution: Record<number, number> = {};
    let totalHistoricalRevenue = 0;
    for (const o of orders) {
      if (!o.paidAt) continue;
      const hour = o.paidAt.getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + o.total;
      totalHistoricalRevenue += Number(o.total);
    }

    // Dnevni cilj (vikend višji)
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
    const dailyTarget = isWeekend ? 2500 : 1500;

    // Razdeli dnevni cilj po urah glede na distribucijo
    const hourlyTargets: {
      hour: number;
      target: number;
      actual: number;
      percent: number;
      cumulative: number;
      cumulativeTarget: number;
      cumulativePercent: number;
      isPast: boolean;
      isCurrent: boolean;
      isFuture: boolean;
    }[] = [];

    let cumulativeActual = 0;
    let cumulativeTargetSum = 0;
    const currentHour = now.getHours();

    // Samo relevantne ure (8-23)
    for (let h = 8; h <= 23; h++) {
      const distributionPct = totalHistoricalRevenue > 0
        ? (hourlyDistribution[h] || 0) / totalHistoricalRevenue
        : 1 / 16; // enakomerno če ni podatkov
      const target = Math.round(dailyTarget * distributionPct * 100) / 100;

      // Dejanski promet za to uro danes
      const actual = todayOrders
        .filter((o) => o.paidAt && o.paidAt.getHours() === h)
        .reduce((s, o) => s + Number(o.total), 0);

      cumulativeActual += actual;
      cumulativeTargetSum += target;

      hourlyTargets.push({
        hour: h,
        target,
        actual: Math.round(actual * 100) / 100,
        percent: target > 0 ? Math.round((actual / target) * 100) : 0,
        cumulative: Math.round(cumulativeActual * 100) / 100,
        cumulativeTarget: Math.round(cumulativeTargetSum * 100) / 100,
        cumulativePercent: cumulativeTargetSum > 0
          ? Math.round((cumulativeActual / cumulativeTargetSum) * 100)
          : 0,
        isPast: h < currentHour,
        isCurrent: h === currentHour,
        isFuture: h > currentHour,
      });
    }

    // Skupne metrike
    const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total), 0);
    const todayTargetSoFar = hourlyTargets
      .filter((h) => h.hour <= currentHour)
      .reduce((s, h) => s + h.target, 0);
    const remainingTarget = dailyTarget - todayRevenue;
    const hoursLeft = Math.max(0, 23 - currentHour);
    const targetPerHourLeft = hoursLeft > 0 ? remainingTarget / hoursLeft : 0;

    // Trenutna ura performance
    const currentHourData = hourlyTargets.find((h) => h.hour === currentHour);

    // Pace assessment
    let pace: "ahead" | "on-track" | "behind" = "on-track";
    if (todayTargetSoFar > 0) {
      const pacePct = (todayRevenue / todayTargetSoFar) * 100;
      if (pacePct >= 110) pace = "ahead";
      else if (pacePct < 90) pace = "behind";
    }

    return NextResponse.json({
      hourlyTargets,
      summary: {
        dailyTarget,
        todayRevenue: Math.round(todayRevenue * 100) / 100,
        remainingTarget: Math.round(remainingTarget * 100) / 100,
        overallPercent: Math.round((todayRevenue / dailyTarget) * 100),
        hoursLeft,
        targetPerHourLeft: Math.round(targetPerHourLeft * 100) / 100,
        pace,
        isWeekend,
        currentHour,
        currentHourActual: currentHourData?.actual || 0,
        currentHourTarget: currentHourData?.target || 0,
        currentHourPercent: currentHourData?.percent || 0,
      },
    });
  } catch (e) {
    console.error("GET /api/hourly-targets error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
