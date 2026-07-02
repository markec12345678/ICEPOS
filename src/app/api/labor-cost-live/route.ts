import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/labor-cost-live — real-time labor cost tracker
// Vrne: aktivne delavce, strošek v realnem času, urno statistiko
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const date = req.nextUrl.searchParams.get("date") || today;

    // Vsi timesheet-i za ta dan
    const timesheets = await db.timesheet.findMany({
      where: { date },
      include: {
        operator: {
          select: { id: true, name: true, role: true, hourlyRate: true },
        },
      },
    });

    const now = new Date();

    // Pridobi promet za ta dan
    const startOfDay = new Date(date + "T00:00:00");
    const endOfDay = new Date(date + "T23:59:59");
    const paidOrders = await db.order.findMany({
      where: {
        restaurantId: tenant.id,
        status: "paid",
        paidAt: { gte: startOfDay, lte: endOfDay },
      },
      select: { total: true, paidAt: true },
    });

    const dayRevenue = paidOrders.reduce((s, o) => s + o.total, 0);

    // Izračunaj strošek per operater
    const operators = timesheets.map((ts) => {
      const clockOut = ts.clockOut || now;
      const totalMinutes = (clockOut.getTime() - ts.clockIn.getTime()) / 60000;
      const workMinutes = Math.max(0, totalMinutes - ts.breakMinutes);
      const hours = workMinutes / 60;
      const cost = hours * ts.operator.hourlyRate;
      const isClockedIn = !ts.clockOut;

      return {
        timesheetId: ts.id,
        operatorId: ts.operator.id,
        operatorName: ts.operator.name,
        role: ts.operator.role,
        hourlyRate: ts.operator.hourlyRate,
        clockIn: ts.clockIn.toISOString(),
        clockOut: ts.clockOut?.toISOString() || null,
        breakMinutes: ts.breakMinutes,
        workMinutes: Math.round(workMinutes),
        workHours: Math.round(hours * 100) / 100,
        cost: Math.round(cost * 100) / 100,
        isClockedIn,
        elapsedMinutes: isClockedIn ? Math.round((now.getTime() - ts.clockIn.getTime()) / 60000) : 0,
      };
    });

    // Skupne metrike
    const totalHours = operators.reduce((s, o) => s + o.workHours, 0);
    const totalCost = operators.reduce((s, o) => s + o.cost, 0);
    const activeCount = operators.filter((o) => o.isClockedIn).length;
    const laborCostPct = dayRevenue > 0 ? (totalCost / dayRevenue) * 100 : 0;

    // Urna statistika stroška
    const hourlyCost: { hour: number; cost: number; count: number }[] = [];
    for (let h = 0; h < 24; h++) {
      let hourCost = 0;
      let count = 0;
      for (const op of operators) {
        const clockIn = new Date(op.clockIn);
        const clockOut = op.clockOut ? new Date(op.clockOut) : now;
        const hourStart = new Date(date + `T${String(h).padStart(2, "0")}:00:00`);
        const hourEnd = new Date(date + `T${String(h).padStart(2, "0")}:59:59`);

        if (clockIn <= hourEnd && clockOut >= hourStart) {
          const overlapStart = new Date(Math.max(clockIn.getTime(), hourStart.getTime()));
          const overlapEnd = new Date(Math.min(clockOut.getTime(), hourEnd.getTime()));
          const overlapMin = (overlapEnd.getTime() - overlapStart.getTime()) / 60000;
          if (overlapMin > 0) {
            hourCost += (overlapMin / 60) * op.hourlyRate;
            count++;
          }
        }
      }
      if (hourCost > 0 || count > 0) {
        hourlyCost.push({
          hour: h,
          cost: Math.round(hourCost * 100) / 100,
          count,
        });
      }
    }

    // Priporočilo
    let recommendation = "";
    if (laborCostPct > 35) {
      recommendation = "⚠️ Visok strošek dela (>35%) — razmisli o zmanjšanju osebja v tišjih urah";
    } else if (laborCostPct > 25) {
      recommendation = "📈 Srednji strošek dela (25-35%) — spremljaj produktivnost";
    } else if (laborCostPct > 0) {
      recommendation = "✅ Dober strošek dela (<25%) — optimalna zasedba";
    }

    return NextResponse.json({
      date,
      operators,
      summary: {
        totalHours: Math.round(totalHours * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        activeCount,
        totalCount: operators.length,
        dayRevenue: Math.round(dayRevenue * 100) / 100,
        laborCostPct: Math.round(laborCostPct * 10) / 10,
        avgHourlyCost: totalHours > 0 ? Math.round((totalCost / totalHours) * 100) / 100 : 0,
        recommendation,
      },
      hourlyCost,
    });
  } catch (e) {
    console.error("GET /api/labor-cost-live error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
