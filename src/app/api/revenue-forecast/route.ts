// @ts-nocheck — pre-existing TS errors
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/revenue-forecast — napoved dnevnega prometa za naslednjih 7 dni
// Uporablja: povprečje po dnevih v tednu + trend + sezonskost
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    // Pridobi zadnjih 90 dni zgodovine
    const since90 = new Date();
    since90.setDate(since90.getDate() - 90);

    const orders = await db.order.findMany({
      where: {
        restaurantId: tenant.id,
        status: "paid",
        paidAt: { gte: since90 },
      },
      select: { total: true, tip: true, paidAt: true },
    });

    if (orders.length === 0) {
      return NextResponse.json({
        forecast: [],
        summary: { avgDaily: 0, confidence: 0, trend: 0 },
      });
    }

    // Grupiraj po dnevih
    const dailyRevenue: Record<string, { revenue: number; orders: number }> = {};
    for (const o of orders) {
      if (!o.paidAt) continue;
      const dateKey = o.paidAt.toISOString().slice(0, 10);
      if (!dailyRevenue[dateKey]) dailyRevenue[dateKey] = { revenue: 0, orders: 0 };
      dailyRevenue[dateKey].revenue += o.total;
      dailyRevenue[dateKey].orders++;
    }

    // Povprečje po dnevih v tednu (0=ned, 1=pon, ...)
    const dayOfWeekRevenue: Record<number, { total: number; count: number; avg: number }> = {};
    for (const [date, data] of Object.entries(dailyRevenue)) {
      const dow = new Date(date).getDay();
      if (!dayOfWeekRevenue[dow]) dayOfWeekRevenue[dow] = { total: 0, count: 0, avg: 0 };
      dayOfWeekRevenue[dow].total += data.revenue;
      dayOfWeekRevenue[dow].count++;
    }
    for (const dow of Object.keys(dayOfWeekRevenue)) {
      const d = dayOfWeekRevenue[parseInt(dow)];
      d.avg = d.count > 0 ? d.total / d.count : 0;
    }

    // Trend: primerjaj zadnji teden s prejšnjim
    const now = new Date();
    const last7 = new Date();
    last7.setDate(last7.getDate() - 7);
    const prev7 = new Date();
    prev7.setDate(prev7.getDate() - 14);

    const lastWeekRev = orders
      .filter((o) => o.paidAt && o.paidAt >= last7)
      .reduce((s, o) => s + o.total, 0);
    const prevWeekRev = orders
      .filter((o) => o.paidAt && o.paidAt >= prev7 && o.paidAt < last7)
      .reduce((s, o) => s + o.total, 0);

    const trendPct = prevWeekRev > 0 ? ((lastWeekRev - prevWeekRev) / prevWeekRev) * 100 : 0;

    // Napovej naslednjih 7 dni
    const dayNames = ["Nedelja", "Ponedeljek", "Torek", "Sreda", "Četrtek", "Petek", "Sobota"];
    const dayNamesShort = ["Ned", "Pon", "Tor", "Sre", "Čet", "Pet", "Sob"];
    const forecast: {
      date: string;
      dayOfWeek: number;
      dayName: string;
      dayNameShort: string;
      predicted: number;
      confidence: number;
      isWeekend: boolean;
    }[] = [];

    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dow = d.getDay();
      const dowData = dayOfWeekRevenue[dow];

      // Osnova: povprečje za ta dan v tednu
      let predicted = dowData?.avg || 0;

      // Prilagodi za trend (če raste, povečaj; če pada, zmanjšaj)
      const trendMultiplier = 1 + (trendPct / 100) * 0.3; // 30% trend vpliva
      predicted *= trendMultiplier;

      // Confidence: koliko podatkov imamo za ta dan
      const sampleSize = dowData?.count || 0;
      const confidence = Math.min(100, Math.round((sampleSize / 8) * 100)); // 8+ vzorcev = 100% confidence

      forecast.push({
        date: d.toISOString().slice(0, 10),
        dayOfWeek: dow,
        dayName: dayNames[dow],
        dayNameShort: dayNamesShort[dow],
        predicted: Math.round(predicted * 100) / 100,
        confidence,
        isWeekend: dow === 5 || dow === 6 || dow === 0,
      });
    }

    // Povprečni dnevni promet
    const allDailyValues = Object.values(dailyRevenue).map((d) => d.revenue);
    const avgDaily = allDailyValues.length > 0
      ? allDailyValues.reduce((s, v) => s + v, 0) / allDailyValues.length
      : 0;

    // Skupni napovedani promet za 7 dni
    const totalForecast = forecast.reduce((s, f) => s + f.predicted, 0);

    return NextResponse.json({
      forecast,
      summary: {
        avgDaily: Math.round(avgDaily * 100) / 100,
        totalForecast: Math.round(totalForecast * 100) / 100,
        trend: Math.round(trendPct * 10) / 10,
        confidence: Math.round(forecast.reduce((s, f) => s + f.confidence, 0) / forecast.length),
        sampleDays: allDailyValues.length,
      },
      dayOfWeekAverages: Array.from({ length: 7 }, (_, i) => ({
        day: i,
        dayName: dayNamesShort[i],
        avg: Math.round((dayOfWeekRevenue[i]?.avg || 0) * 100) / 100,
        count: dayOfWeekRevenue[i]?.count || 0,
      })),
    });
  } catch (e) {
    console.error("GET /api/revenue-forecast error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
