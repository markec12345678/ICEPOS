import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/customers/frequency-prediction — napoved kdaj bo stranka ponovno obiskala
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const customers = await db.customer.findMany({
      where: { restaurantId: tenant.id },
      include: {
        orders: {
          where: { status: "paid" },
          select: { paidAt: true, total: true },
          orderBy: { paidAt: "asc" },
        },
      },
    });

    const now = new Date();
    const predictions: {
      id: string;
      name: string;
      phone: string | null;
      totalSpent: number;
      visitCount: number;
      lastVisit: string;
      avgDaysBetween: number;
      predictedNextVisit: string;
      daysUntilPredicted: number;
      status: "overdue" | "due" | "expected" | "new";
      confidence: number;
      preferredDayName: string;
      preferredHour: number;
      atRisk: boolean;
    }[] = [];

    for (const c of customers) {
      if (c.orders.length < 2) continue;

      const visits = c.orders
        .map((o) => o.paidAt)
        .filter((d): d is Date => d !== null)
        .sort((a, b) => a.getTime() - b.getTime());

      if (visits.length < 2) continue;

      // Povprečni dnevi med obiski
      let totalDays = 0;
      for (let i = 1; i < visits.length; i++) {
        totalDays += (visits[i].getTime() - visits[i - 1].getTime()) / 86400000;
      }
      const avgDaysBetween = totalDays / (visits.length - 1);

      const lastVisit = visits[visits.length - 1];
      const predictedNext = new Date(lastVisit.getTime() + avgDaysBetween * 86400000);
      const daysUntilPredicted = Math.ceil((predictedNext.getTime() - now.getTime()) / 86400000);

      // Status
      let status: "overdue" | "due" | "expected" | "new" = "expected";
      if (daysUntilPredicted < -7) status = "overdue";
      else if (daysUntilPredicted < 0) status = "due";
      else if (daysUntilPredicted <= 7) status = "due";

      // Confidence: več obiskov = višje zaupanje
      const confidence = Math.min(100, Math.round((visits.length / 10) * 100));

      // Preferirani dan v tednu
      const dayCounts: Record<number, number> = {};
      for (const v of visits) {
        const dow = v.getDay();
        dayCounts[dow] = (dayCounts[dow] || 0) + 1;
      }
      const dayNames = ["Nedelja", "Ponedeljek", "Torek", "Sreda", "Četrtek", "Petek", "Sobota"];
      const preferredDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
      const preferredDayName = preferredDay ? dayNames[parseInt(preferredDay[0])] : "—";

      // Preferirana ura
      const hourCounts: Record<number, number> = {};
      for (const v of visits) {
        const h = v.getHours();
        hourCounts[h] = (hourCounts[h] || 0) + 1;
      }
      const preferredHourEntry = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
      const preferredHour = preferredHourEntry ? parseInt(preferredHourEntry[0]) : -1;

      // At risk: če je preteklo več kot 2× povprečni interval
      const daysSinceLast = (now.getTime() - lastVisit.getTime()) / 86400000;
      const atRisk = daysSinceLast > avgDaysBetween * 2;

      predictions.push({
        id: c.id,
        name: c.name,
        phone: c.phone,
        totalSpent: Math.round(c.totalSpent * 100) / 100,
        visitCount: visits.length,
        lastVisit: lastVisit.toISOString(),
        avgDaysBetween: Math.round(avgDaysBetween * 10) / 10,
        predictedNextVisit: predictedNext.toISOString(),
        daysUntilPredicted,
        status,
        confidence,
        preferredDayName,
        preferredHour,
        atRisk,
      });
    }

    // Sortiraj: overdue prvi, potem due, potem po daysUntilPredicted
    const statusOrder = { overdue: 0, due: 1, expected: 2, new: 3 };
    predictions.sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || a.daysUntilPredicted - b.daysUntilPredicted);

    return NextResponse.json({
      predictions: predictions.slice(0, 20),
      summary: {
        total: predictions.length,
        overdue: predictions.filter((p) => p.status === "overdue").length,
        due: predictions.filter((p) => p.status === "due").length,
        atRisk: predictions.filter((p) => p.atRisk).length,
        avgConfidence: predictions.length > 0
          ? Math.round(predictions.reduce((s, p) => s + p.confidence, 0) / predictions.length)
          : 0,
      },
    });
  } catch (e) {
    console.error("GET /api/customers/frequency-prediction error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
