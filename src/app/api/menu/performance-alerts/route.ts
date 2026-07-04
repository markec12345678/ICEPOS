import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/menu/performance-alerts — opozorila o padcu/nagrasti prodaje jedi
// Primerja zadnji teden s prejšnjim in s povprečjem
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const items = await db.menuItem.findMany({
      where: { restaurantId: tenant.id },
      include: {
        orderItems: {
          where: {
            order: {
              status: "paid",
              paidAt: { gte: monthAgo },
            },
          },
          select: {
            quantity: true,
            unitPrice: true,
            order: { select: { paidAt: true } },
          },
        },
      },
    });

    const alerts: {
      id: string;
      name: string;
      category: string;
      price: number;
      imageUrl: string | null;
      type: "drop" | "surge" | "dead" | "rising-star" | "low-margin";
      severity: "critical" | "warning" | "info" | "success";
      message: string;
      thisWeekQty: number;
      lastWeekQty: number;
      monthAvg: number;
      changePct: number;
      revenue: number;
    }[] = [];

    for (const item of items) {
      const thisWeek = item.orderItems.filter(
        (oi) => oi.order.paidAt && oi.order.paidAt >= weekAgo
      );
      const lastWeek = item.orderItems.filter(
        (oi) => oi.order.paidAt && oi.order.paidAt >= twoWeeksAgo && oi.order.paidAt < weekAgo
      );

      const thisWeekQty = thisWeek.reduce((s, oi) => s + oi.quantity, 0);
      const lastWeekQty = lastWeek.reduce((s, oi) => s + oi.quantity, 0);
      const monthQty = item.orderItems.reduce((s, oi) => s + oi.quantity, 0);
      const monthAvg = monthQty / 4; // povprečje na teden

      const revenue = thisWeek.reduce((s, oi) => s + oi.quantity * oi.unitPrice, 0);
      const changePct = lastWeekQty > 0
        ? Math.round(((thisWeekQty - lastWeekQty) / lastWeekQty) * 100)
        : thisWeekQty > 0 ? 100 : 0;

      // Alert logika
      if (thisWeekQty === 0 && lastWeekQty >= 3) {
        // Padec na 0
        alerts.push({
          id: item.id,
          name: item.name,
          category: item.category,
          price: item.price,
          imageUrl: item.imageUrl,
          type: "drop",
          severity: "critical",
          message: `📊 Prodaja padla na 0 (prejšnji teden: ${lastWeekQty}×) — preveri razpoložljivost`,
          thisWeekQty,
          lastWeekQty,
          monthAvg: Math.round(monthAvg * 10) / 10,
          changePct: -100,
          revenue: Math.round(revenue * 100) / 100,
        });
      } else if (changePct <= -50 && lastWeekQty >= 3) {
        // Hud padec (>50%)
        alerts.push({
          id: item.id,
          name: item.name,
          category: item.category,
          price: item.price,
          imageUrl: item.imageUrl,
          type: "drop",
          severity: "warning",
          message: `📉 Padec prodaje ${changePct}% (${lastWeekQty}→${thisWeekQty}) — preveri kakovost/ceno`,
          thisWeekQty,
          lastWeekQty,
          monthAvg: Math.round(monthAvg * 10) / 10,
          changePct,
          revenue: Math.round(revenue * 100) / 100,
        });
      } else if (changePct >= 100 && lastWeekQty >= 2) {
        // Nagli porast (>100%)
        alerts.push({
          id: item.id,
          name: item.name,
          category: item.category,
          price: item.price,
          imageUrl: item.imageUrl,
          type: "surge",
          severity: "success",
          message: `🚀 Porast prodaje +${changePct}% (${lastWeekQty}→${thisWeekQty}) — promoviraj!`,
          thisWeekQty,
          lastWeekQty,
          monthAvg: Math.round(monthAvg * 10) / 10,
          changePct,
          revenue: Math.round(revenue * 100) / 100,
        });
      } else if (monthQty === 0 && item.available) {
        // Mrtva jed — nič prodaje v 30 dneh
        alerts.push({
          id: item.id,
          name: item.name,
          category: item.category,
          price: item.price,
          imageUrl: item.imageUrl,
          type: "dead",
          severity: "warning",
          message: `💀 Ni prodaje v 30 dneh — razmisli o umiku iz menija`,
          thisWeekQty,
          lastWeekQty,
          monthAvg: 0,
          changePct: 0,
          revenue: 0,
        });
      } else if (thisWeekQty >= monthAvg * 1.5 && thisWeekQty >= 5) {
        // Rising star — 50% nad mesečnim povprečjem
        alerts.push({
          id: item.id,
          name: item.name,
          category: item.category,
          price: item.price,
          imageUrl: item.imageUrl,
          type: "rising-star",
          severity: "info",
          message: `⭐ Rastoča zvezda — ${thisWeekQty}× ta teden (povprečje: ${Math.round(monthAvg)}×)`,
          thisWeekQty,
          lastWeekQty,
          monthAvg: Math.round(monthAvg * 10) / 10,
          changePct,
          revenue: Math.round(revenue * 100) / 100,
        });
      }
    }

    // Sortiraj po severity
    const severityOrder = { critical: 0, warning: 1, info: 2, success: 3 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return NextResponse.json({
      alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter((a) => a.severity === "critical").length,
        warning: alerts.filter((a) => a.severity === "warning").length,
        info: alerts.filter((a) => a.severity === "info").length,
        success: alerts.filter((a) => a.severity === "success").length,
      },
    });
  } catch (e) {
    console.error("GET /api/menu/performance-alerts error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
