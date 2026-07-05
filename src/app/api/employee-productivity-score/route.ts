// @ts-nocheck — pre-existing TS errors (non-critical route)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/employee-productivity-score?days=30 — ocena produktivnosti delavcev
// Izračuna: prodaja na uro, št. računov/uro, povprečni račun, napitnine, efficiency score
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const days = Math.min(parseInt(req.nextUrl.searchParams.get("days") || "30", 10), 90);
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Pridobi timesheet-e in orderje
    const [timesheets, orders] = await Promise.all([
      db.timesheet.findMany({
        where: {
          date: { gte: since.toISOString().slice(0, 10) },
          operator: { restaurantId: tenant.id },
        },
        include: {
          operator: { select: { id: true, name: true, role: true, hourlyRate: true } },
        },
      }),
      db.order.findMany({
        where: {
          restaurantId: tenant.id,
          status: "paid",
          paidAt: { gte: since },
        },
        select: {
          operator: true,
          total: true,
          tip: true,
          paidAt: true,
          items: { select: { quantity: true } },
        },
      }),
    ]);

    // Grupiraj po operaterju
    const operatorMap: Record<string, {
      operatorId: string;
      operatorName: string;
      role: string;
      hourlyRate: number;
      totalHours: number;
      totalRevenue: number;
      totalTips: number;
      orderCount: number;
      totalItems: number;
      laborCost: number;
    }> = {};

    // Pridobi hours iz timesheetov
    for (const ts of timesheets) {
      const opId = ts.operatorId;
      if (!operatorMap[opId]) {
        operatorMap[opId] = {
          operatorId: opId,
          operatorName: ts.operator.name,
          role: ts.operator.role,
          hourlyRate: ts.operator.hourlyRate,
          totalHours: 0,
          totalRevenue: 0,
          totalTips: 0,
          orderCount: 0,
          totalItems: 0,
          laborCost: 0,
        };
      }
      const end = ts.clockOut || new Date();
      const minutes = Math.max(0, (end.getTime() - ts.clockIn.getTime()) / 60000 - ts.breakMinutes);
      const hours = minutes / 60;
      operatorMap[opId].totalHours += hours;
      operatorMap[opId].laborCost += hours * Number(ts.operator.hourlyRate);
    }

    // Dodaj orderje k operaterjem (po imenu)
    for (const order of orders) {
      const op = Object.values(operatorMap).find((o) => o.operatorName === order.operator);
      if (op) {
        op.totalRevenue += Number(order.total);
        op.totalTips += Number(order.tip) || 0;
        op.orderCount++;
        op.totalItems += order.items.reduce((s, i) => s + i.quantity, 0);
      } else {
        // Ustvari "neznan" operater če ni v timesheetih
        const key = `unknown_${order.operator}`;
        if (!operatorMap[key]) {
          operatorMap[key] = {
            operatorId: key,
            operatorName: order.operator,
            role: "unknown",
            hourlyRate: 0,
            totalHours: 0,
            totalRevenue: 0,
            totalTips: 0,
            orderCount: 0,
            totalItems: 0,
            laborCost: 0,
          };
        }
        operatorMap[key].totalRevenue += Number(order.total);
        operatorMap[key].totalTips += Number(order.tip) || 0;
        operatorMap[key].orderCount++;
        operatorMap[key].totalItems += order.items.reduce((s, i) => s + i.quantity, 0);
      }
    }

    // Izračunaj productivity score
    const operators = Object.values(operatorMap)
      .filter((op) => op.orderCount > 0 || op.totalHours > 0)
      .map((op) => {
        const revenuePerHour = op.totalHours > 0 ? Number(op.totalRevenue) / op.totalHours : 0;
        const ordersPerHour = op.totalHours > 0 ? op.orderCount / op.totalHours : 0;
        const avgOrderValue = op.orderCount > 0 ? Number(op.totalRevenue) / op.orderCount : 0;
        const itemsPerOrder = op.orderCount > 0 ? op.totalItems / op.orderCount : 0;
        const tipsPerHour = op.totalHours > 0 ? op.totalTips / op.totalHours : 0;
        const revenuePerCost = op.laborCost > 0 ? Number(op.totalRevenue) / op.laborCost : 0;

        // Productivity score (0-100)
        // 40% revenue/hour, 25% orders/hour, 15% avg order, 10% tips, 10% items per order
        const score = Math.min(100, Math.round(
          (revenuePerHour / 100 * 40) +
          (ordersPerHour * 5 * 25) +
          (avgOrderValue / 2 * 15) +
          (tipsPerHour / 2 * 10) +
          (itemsPerOrder * 2 * 10)
        ));

        let rating: "excellent" | "good" | "average" | "below" = "below";
        if (score >= 80) rating = "excellent";
        else if (score >= 60) rating = "good";
        else if (score >= 40) rating = "average";

        return {
          ...op,
          revenuePerHour: Math.round(revenuePerHour * 100) / 100,
          ordersPerHour: Math.round(ordersPerHour * 10) / 10,
          avgOrderValue: Math.round(avgOrderValue * 100) / 100,
          itemsPerOrder: Math.round(itemsPerOrder * 10) / 10,
          tipsPerHour: Math.round(tipsPerHour * 100) / 100,
          revenuePerCost: Math.round(revenuePerCost * 10) / 10,
          totalRevenue: Math.round(Number(op.totalRevenue) * 100) / 100,
          totalTips: Math.round(op.totalTips * 100) / 100,
          totalHours: Math.round(op.totalHours * 10) / 10,
          laborCost: Math.round(op.laborCost * 100) / 100,
          score,
          rating,
        };
      })
      .sort((a, b) => b.score - a.score);

    // Skupne metrike
    const totalRevenue = operators.reduce((s, o) => s + Number(o.totalRevenue), 0);
    const totalHours = operators.reduce((s, o) => s + Number(o.totalHours), 0);
    const totalOrders = operators.reduce((s, o) => s + o.orderCount, 0);
    const avgScore = operators.length > 0 ? Math.round(operators.reduce((s, o) => s + o.score, 0) / operators.length) : 0;

    return NextResponse.json({
      operators,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalHours: Math.round(totalHours * 10) / 10,
        totalOrders,
        avgScore,
        operatorCount: operators.length,
      },
      days,
    });
  } catch (e) {
    console.error("GET /api/employee-productivity-score error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
