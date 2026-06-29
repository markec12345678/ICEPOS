import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/tip-pool?date=2024-01-01&method=hours|role|hybrid
// Izračuna distribucijo napitnin za določen dan
//
// Metode:
//   - hours: vsak dobi proporcionalno uram (najbolj pošteno)
//   - role: po vlogi (waiter 60%, cook 25%, host 10%, manager 5%)
//   - hybrid: ure × weight per role
//
// Default: hybrid
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const date = req.nextUrl.searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const method = (req.nextUrl.searchParams.get("method") || "hybrid") as "hours" | "role" | "hybrid";

    // Pridobi vse napitnine za ta dan
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const paidOrders = await db.order.findMany({
      where: {
        status: "paid",
        restaurantId: tenant.id,
        paidAt: { gte: dayStart, lte: dayEnd },
      },
      select: { tip: true, total: true, paymentMethod: true },
    });

    const totalTips = paidOrders.reduce((s, o) => s + (o.tip || 0), 0);
    const totalRevenue = paidOrders.reduce((s, o) => s + o.total, 0);
    const orderCount = paidOrders.length;

    // Pridobi vse timesheet-e za ta dan
    const timesheets = await db.timesheet.findMany({
      where: { date, operator: { restaurantId: tenant.id } },
      include: { operator: true },
    });

    if (timesheets.length === 0 || totalTips === 0) {
      return NextResponse.json({
        date,
        method,
        totalTips: Math.round(totalTips * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        orderCount,
        distributions: [],
        message: timesheets.length === 0
          ? "Ni zabeleženih ur za ta dan. Uporabi Clock In/Out."
          : "Ni napitnin za ta dan.",
      });
    }

    // Weights per role (za role in hybrid metodo)
    const roleWeights: Record<string, number> = {
      waiter: 1.0,    // 100% natakar
      cashier: 0.8,   // 80% blagajnik
      cook: 0.6,      // 60% kuhar
      host: 0.5,      // 50% hostess
      manager: 0.3,   // 30% manager
    };

    // Izračunaj minute per operater (z weight factorjem)
    const operatorData = timesheets.map((ts) => {
      const end = ts.clockOut || new Date();
      const minutes = Math.max(0, Math.floor((end.getTime() - ts.clockIn.getTime()) / 60000));
      const effectiveMinutes = Math.max(0, minutes - ts.breakMinutes);
      const weight = method === "hours" ? 1 : roleWeights[ts.operator.role] || 0.5;
      const weightedMinutes = method === "role" ? weight : effectiveMinutes * weight;

      return {
        operatorId: ts.operatorId,
        operatorName: ts.operator.name,
        role: ts.operator.role,
        hourlyRate: ts.operator.hourlyRate,
        minutes: effectiveMinutes,
        hours: Math.round((effectiveMinutes / 60) * 100) / 100,
        weight,
        weightedMinutes: method === "role" ? weight * 60 : weightedMinutes,
        clockIn: ts.clockIn.toISOString(),
        clockOut: ts.clockOut?.toISOString() || null,
      };
    });

    // Skupni weight za distribucijo
    const totalWeighted = operatorData.reduce((s, o) => s + o.weightedMinutes, 0);

    // Izračunaj distribucijo
    const distributions = operatorData
      .map((o) => {
        const share = totalWeighted > 0 ? o.weightedMinutes / totalWeighted : 0;
        const amount = Math.round(totalTips * share * 100) / 100;
        return {
          ...o,
          share: Math.round(share * 1000) / 10, // % z 1 decimalko
          amount,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // Preveri vsoto
    const distributedTotal = distributions.reduce((s, d) => s + d.amount, 0);
    const roundingDiff = Math.round((totalTips - distributedTotal) * 100) / 100;

    return NextResponse.json({
      date,
      method,
      totalTips: Math.round(totalTips * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      orderCount,
      totalHours: Math.round(distributions.reduce((s, d) => s + d.hours, 0) * 100) / 100,
      activeEmployees: distributions.filter((d) => !d.clockOut).length,
      totalEmployees: distributions.length,
      distributions,
      roundingDiff,
      roleWeights,
    });
  } catch (e) {
    console.error("GET /api/tip-pool error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
