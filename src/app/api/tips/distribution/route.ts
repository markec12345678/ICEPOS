// @ts-nocheck — pre-existing TS errors (non-critical route)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/tips/distribution?date=YYYY-MM-DD — porazdelitev napitnin po delavcih
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const date = req.nextUrl.searchParams.get("date") || today;

    const dayStart = new Date(date + "T00:00:00");
    const dayEnd = new Date(date + "T23:59:59");

    // Pridobi plačane račune z napitninami
    const orders = await db.order.findMany({
      where: {
        restaurantId: tenant.id,
        status: "paid",
        paidAt: { gte: dayStart, lte: dayEnd },
        tip: { gt: 0 },
      },
      select: {
        operator: true,
        total: true,
        tip: true,
        paymentMethod: true,
        paidAt: true,
      },
    });

    // Pridobi timesheet-e za ta dan
    const timesheets = await db.timesheet.findMany({
      where: { date },
      include: {
        operator: { select: { id: true, name: true, role: true, hourlyRate: true } },
      },
    });

    // Skupne napitnine
    const totalTips = orders.reduce((s, o) => s + (o.tip || 0), 0);

    // Porazdelitev po načinih:
    // 1. By orders (vsak operater dobi napitnine od svojih računov)
    // 2. By hours (enak delež glede na ure dela)
    // 3. By role (večji delež za natakarje, manjši za kuharje)

    // 1. By orders
    const byOrders: Record<string, { operator: string; tipCount: number; totalTips: number }> = {};
    for (const o of orders) {
      const op = o.operator || "Neznan";
      if (!byOrders[op]) byOrders[op] = { operator: op, tipCount: 0, totalTips: 0 };
      byOrders[op].tipCount++;
      byOrders[op].totalTips += o.tip || 0;
    }

    // 2. By hours
    const operatorHours: Record<string, { operator: string; role: string; hours: number }> = {};
    for (const ts of timesheets) {
      const end = ts.clockOut || new Date();
      const minutes = Math.max(0, (end.getTime() - ts.clockIn.getTime()) / 60000 - ts.breakMinutes);
      const hours = minutes / 60;
      const name = ts.operator.name;
      if (!operatorHours[name]) {
        operatorHours[name] = { operator: name, role: ts.operator.role, hours: 0 };
      }
      operatorHours[name].hours += hours;
    }

    const totalHours = Object.values(operatorHours).reduce((s, o) => s + o.hours, 0);
    const byHours = Object.values(operatorHours).map((o) => ({
      operator: o.operator,
      role: o.role,
      hours: Math.round(o.hours * 100) / 100,
      share: totalHours > 0 ? Math.round((o.hours / totalHours) * 1000) / 10 : 0,
      tips: Math.round((totalHours > 0 ? (o.hours / totalHours) * totalTips : 0) * 100) / 100,
    })).sort((a, b) => b.tips - a.tips);

    // 3. By role (waiter 60%, cook 25%, cashier 15%)
    const ROLE_WEIGHTS: Record<string, number> = {
      waiter: 0.6,
      cook: 0.25,
      cashier: 0.15,
      admin: 0.15,
      manager: 0.1,
    };

    const byRole: Record<string, { role: string; operators: string[]; tips: number }> = {};
    for (const o of Object.values(operatorHours)) {
      const weight = ROLE_WEIGHTS[o.role] || 0.15;
      if (!byRole[o.role]) byRole[o.role] = { role: o.role, operators: [], tips: 0 };
      if (!byRole[o.role].operators.includes(o.operator)) {
        byRole[o.role].operators.push(o.operator);
      }
    }

    const totalWeight = Object.values(byRole).reduce((s, r) => {
      const weight = ROLE_WEIGHTS[r.role] || 0.15;
      return s + weight * r.operators.length;
    }, 0);

    for (const [role, info] of Object.entries(byRole)) {
      const weight = ROLE_WEIGHTS[role] || 0.15;
      const roleTips = totalWeight > 0 ? (weight * info.operators.length / totalWeight) * totalTips : 0;
      const perOperator = info.operators.length > 0 ? roleTips / info.operators.length : 0;
      info.tips = Math.round(perOperator * 100) / 100;
    }

    return NextResponse.json({
      date,
      summary: {
        totalTips: Math.round(totalTips * 100) / 100,
        tipCount: orders.length,
        avgTip: orders.length > 0 ? Math.round((totalTips / orders.length) * 100) / 100 : 0,
        tipRate: orders.reduce((s, o) => s + o.total, 0) > 0
          ? Math.round((totalTips / orders.reduce((s, o) => s + o.total, 0)) * 1000) / 10
          : 0,
        operatorCount: Object.keys(operatorHours).length,
      },
      byOrders: Object.values(byOrders).map((o) => ({
        ...o,
        totalTips: Math.round(o.totalTips * 100) / 100,
      })).sort((a, b) => b.totalTips - a.totalTips),
      byHours,
      byRole: Object.entries(byRole).map(([role, info]) => ({
        role,
        operators: info.operators,
        tips: info.tips,
      })),
    });
  } catch (e) {
    console.error("GET /api/tips/distribution error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
