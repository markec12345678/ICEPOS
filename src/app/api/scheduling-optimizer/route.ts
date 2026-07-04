// @ts-nocheck — pre-existing TS errors
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/scheduling-optimizer — AI optimizacija razporeda glede na napoved prometa
// Primerja napovedan promet z razporedom osebja in predlaga spremembe
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    // Pridobi zadnjih 90 dni za vzorec prometa po dnevih v tednu in urah
    const since90 = new Date();
    since90.setDate(since90.getDate() - 90);

    const orders = await db.order.findMany({
      where: {
        restaurantId: tenant.id,
        status: "paid",
        paidAt: { gte: since90 },
      },
      select: { total: true, paidAt: true },
    });

    // Pridobi vse operaterje
    const operators = await db.operator.findMany({
      where: { restaurantId: tenant.id, active: true },
      select: { id: true, name: true, role: true, hourlyRate: true },
    });

    // Pridobi aktualni razpored za ta teden
    const weekStart = new Date();
    const dayOfWeek = weekStart.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(weekStart.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const schedules = await db.schedule.findMany({
      where: {
        restaurantId: tenant.id,
        date: { gte: weekStart.toISOString().slice(0, 10), lt: weekEnd.toISOString().slice(0, 10) },
      },
      include: { operator: { select: { name: true, role: true, hourlyRate: true } } },
    });

    // Pridobi timesheete za ta teden
    const timesheets = await db.timesheet.findMany({
      where: {
        date: { gte: weekStart.toISOString().slice(0, 10), lt: weekEnd.toISOString().slice(0, 10) },
      },
      include: { operator: { select: { name: true, role: true, hourlyRate: true } } },
    });

    // Izračunaj povprečni promet po dnevih v tednu
    const dayNames = ["Nedelja", "Ponedeljek", "Torek", "Sreda", "Četrtek", "Petek", "Sobota"];
    const dayNamesShort = ["Ned", "Pon", "Tor", "Sre", "Čet", "Pet", "Sob"];
    const revenueByDay: Record<number, { total: number; count: number; avg: number }> = {};
    for (const o of orders) {
      if (!o.paidAt) continue;
      const dow = o.paidAt.getDay();
      if (!revenueByDay[dow]) revenueByDay[dow] = { total: 0, count: 0, avg: 0 };
      revenueByDay[dow].total += o.total;
      revenueByDay[dow].count++;
    }
    for (const dow of Object.keys(revenueByDay)) {
      const d = revenueByDay[parseInt(dow)];
      d.avg = d.count > 0 ? d.total / d.count : 0;
    }

    // Izračunaj urni promet (konsolidirano)
    const hourlyRevenue: Record<number, number> = {};
    let totalAllRevenue = 0;
    for (const o of orders) {
      if (!o.paidAt) continue;
      const h = o.paidAt.getHours();
      hourlyRevenue[h] = (hourlyRevenue[h] || 0) + o.total;
      totalAllRevenue += o.total;
    }

    // Povprečni urni promet (glede na število dni z podatki)
    const uniqueDays = new Set(orders.filter((o) => o.paidAt).map((o) => o.paidAt!.toISOString().slice(0, 10))).size;

    // Priporočeno število osebja po dnevih
    // Pravilo: 1 oseba na vsakih 200€ napovedanega prometa, minimum 2
    const STAFF_RATIO = 200;
    const MIN_STAFF = 2;
    const MAX_STAFF = 8;

    const dayRecommendations: {
      day: number;
      dayName: string;
      dayNameShort: string;
      predictedRevenue: number;
      currentStaff: number;
      recommendedStaff: number;
      difference: number;
      laborCost: number;
      laborCostPct: number;
      status: "understaffed" | "optimal" | "overstaffed";
      suggestion: string;
    }[] = [];

    for (let dow = 1; dow <= 7; dow++) {
      const actualDow = dow === 7 ? 0 : dow;
      const avgRev = revenueByDay[actualDow]?.avg || 0;
      const recommended = Math.min(MAX_STAFF, Math.max(MIN_STAFF, Math.ceil(avgRev / STAFF_RATIO)));

      // Štej trenutno razporejene za ta dan
      const dateStr = new Date(weekStart.getTime() + (dow - 1) * 86400000).toISOString().slice(0, 10);
      const daySchedules = schedules.filter((s) => s.date === dateStr);
      const dayTimesheets = timesheets.filter((t) => t.date === dateStr);
      const currentStaff = Math.max(daySchedules.length, dayTimesheets.length);

      const difference = recommended - currentStaff;
      let status: "understaffed" | "optimal" | "overstaffed" = "optimal";
      if (difference > 0) status = "understaffed";
      else if (difference < 0) status = "overstaffed";

      // Ocenjen strošek dela (povprečna ura 8h, povprečna urna postavka 12€)
      const avgHourlyRate = operators.length > 0
        ? operators.reduce((s, o) => s + o.hourlyRate, 0) / operators.length
        : 12;
      const laborCost = currentStaff * 8 * avgHourlyRate;
      const laborCostPct = avgRev > 0 ? Math.round((laborCost / avgRev) * 100) : 0;

      let suggestion = "";
      if (status === "understaffed") {
        suggestion = `➕ Dodaj ${difference} osebo/i — napovedan promet ${Math.round(avgRev)}€ zahteva več osebja`;
      } else if (status === "overstaffed") {
        suggestion = `➖ Zmanjšaj ${Math.abs(difference)} osebo/i — preveč osebja za napovedan promet ${Math.round(avgRev)}€`;
      } else {
        suggestion = `✅ Optimalna zasedba — ${currentStaff} oseb za ${Math.round(avgRev)}€ prometa`;
      }

      dayRecommendations.push({
        day: actualDow,
        dayName: dayNames[actualDow],
        dayNameShort: dayNamesShort[actualDow],
        predictedRevenue: Math.round(avgRev * 100) / 100,
        currentStaff,
        recommendedStaff: recommended,
        difference,
        laborCost: Math.round(laborCost * 100) / 100,
        laborCostPct,
        status,
        suggestion,
      });
    }

    // Urni priporočili (kdy dodati/zmanjšati osebje)
    const peakHours: { hour: number; avgRevenue: number; isPeak: boolean }[] = [];
    for (let h = 8; h <= 23; h++) {
      const avgHourRev = uniqueDays > 0 ? (hourlyRevenue[h] || 0) / uniqueDays : 0;
      const isPeak = avgHourRev > totalAllRevenue / 16 / uniqueDays * 1.5; // 1.5x povprečja = peak
      peakHours.push({
        hour: h,
        avgRevenue: Math.round(avgHourRev * 100) / 100,
        isPeak,
      });
    }

    // Skupne metrike
    const totalPredicted = dayRecommendations.reduce((s, d) => s + d.predictedRevenue, 0);
    const totalCurrentStaff = dayRecommendations.reduce((s, d) => s + d.currentStaff, 0);
    const totalRecommendedStaff = dayRecommendations.reduce((s, d) => s + d.recommendedStaff, 0);
    const understaffedDays = dayRecommendations.filter((d) => d.status === "understaffed").length;
    const overstaffedDays = dayRecommendations.filter((d) => d.status === "overstaffed").length;

    return NextResponse.json({
      dayRecommendations,
      peakHours,
      summary: {
        totalPredictedRevenue: Math.round(totalPredicted * 100) / 100,
        totalCurrentStaff,
        totalRecommendedStaff,
        staffDifference: totalRecommendedStaff - totalCurrentStaff,
        understaffedDays,
        overstaffedDays,
        optimalDays: 7 - understaffedDays - overstaffedDays,
        avgLaborCostPct: dayRecommendations.length > 0
          ? Math.round(dayRecommendations.reduce((s, d) => s + d.laborCostPct, 0) / dayRecommendations.length * 10) / 10
          : 0,
      },
    });
  } catch (e) {
    console.error("GET /api/scheduling-optimizer error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
