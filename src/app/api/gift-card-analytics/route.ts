import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/gift-card-analytics — analitika darilnih kartic
// Podpora za ?from=&to=
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");

    const now = new Date();
    const startDate = from ? new Date(from + "T00:00:00") : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to + "T23:59:59") : now;

    // Vse darilne kartice
    const giftCards = await db.giftCard.findMany({
      where: { restaurantId: tenant.id },
      orderBy: { createdAt: "desc" },
    });

    // Filtriraj po datumu izdaje
    const issuedInPeriod = giftCards.filter(
      (gc) => gc.createdAt >= startDate && gc.createdAt <= endDate
    );

    // Osnovne metrike
    const totalIssued = giftCards.length;
    const totalInitialValue = giftCards.reduce((s, gc) => s + gc.initialAmount, 0);
    const totalRemainingBalance = giftCards.reduce((s, gc) => s + gc.balance, 0);
    const totalRedeemed = totalInitialValue - totalRemainingBalance;
    const redemptionRate = totalInitialValue > 0 ? (totalRedeemed / totalInitialValue) * 100 : 0;

    // Po statusu
    const byStatus = {
      active: giftCards.filter((gc) => gc.status === "active").length,
      redeemed: giftCards.filter((gc) => gc.status === "redeemed").length,
      expired: giftCards.filter((gc) => gc.status === "expired").length,
      blocked: giftCards.filter((gc) => gc.status === "blocked").length,
    };

    // Izdane v obdobju
    const issuedInPeriodValue = issuedInPeriod.reduce((s, gc) => s + gc.initialAmount, 0);

    // Po nominalnih vrednostih
    const byDenomination = new Map<
      number,
      { denomination: number; count: number; totalValue: number; redeemed: number }
    >();

    for (const gc of giftCards) {
      const existing = byDenomination.get(gc.initialAmount);
      if (existing) {
        existing.count++;
        existing.totalValue += gc.initialAmount;
        existing.redeemed += gc.initialAmount - gc.balance;
      } else {
        byDenomination.set(gc.initialAmount, {
          denomination: gc.initialAmount,
          count: 1,
          totalValue: gc.initialAmount,
          redeemed: gc.initialAmount - gc.balance,
        });
      }
    }

    // Mesečna izdaja (za graf)
    const monthlyMap = new Map<
      string,
      { month: string; count: number; value: number }
    >();

    for (const gc of giftCards) {
      const monthKey = gc.createdAt.toISOString().slice(0, 7);
      const existing = monthlyMap.get(monthKey);
      if (existing) {
        existing.count++;
        existing.value += gc.initialAmount;
      } else {
        monthlyMap.set(monthKey, {
          month: monthKey,
          count: 1,
          value: gc.initialAmount,
        });
      }
    }

    // Potekle ali kmalu potekle
    const now2 = new Date();
    const soonThreshold = new Date(now2.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringSoon = giftCards.filter(
      (gc) => gc.expiresAt && gc.expiresAt <= soonThreshold && gc.expiresAt >= now2 && gc.balance > 0
    );
    const expired = giftCards.filter(
      (gc) => gc.expiresAt && gc.expiresAt < now2 && gc.balance > 0
    );

    // Najbolj aktivne kartice (z največ izrabo)
    const mostRedeemed = giftCards
      .filter((gc) => gc.initialAmount - gc.balance > 0)
      .sort((a, b) => (b.initialAmount - b.balance) - (a.initialAmount - a.balance))
      .slice(0, 10)
      .map((gc) => ({
        id: gc.id,
        code: gc.code,
        initialAmount: gc.initialAmount,
        balance: gc.balance,
        redeemed: gc.initialAmount - gc.balance,
        redemptionPercent: gc.initialAmount > 0 ? ((gc.initialAmount - gc.balance) / gc.initialAmount) * 100 : 0,
        customerName: gc.customerName,
        status: gc.status,
        createdAt: gc.createdAt.toISOString(),
      }));

    return NextResponse.json({
      period: {
        from: startDate.toISOString().slice(0, 10),
        to: endDate.toISOString().slice(0, 10),
      },
      summary: {
        totalIssued,
        issuedInPeriod: issuedInPeriod.length,
        issuedInPeriodValue,
        totalInitialValue,
        totalRemainingBalance,
        totalRedeemed,
        redemptionRate,
        avgCardValue: totalIssued > 0 ? totalInitialValue / totalIssued : 0,
        byStatus,
      },
      byDenomination: Array.from(byDenomination.values()).sort((a, b) =>
        a.denomination - b.denomination
      ),
      monthly: Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
      expiringSoon: expiringSoon.map((gc) => ({
        id: gc.id,
        code: gc.code,
        balance: gc.balance,
        expiresAt: gc.expiresAt!.toISOString(),
        customerName: gc.customerName,
      })),
      expiredWithBalance: expired.map((gc) => ({
        id: gc.id,
        code: gc.code,
        balance: gc.balance,
        expiredAt: gc.expiresAt!.toISOString(),
      })),
      mostRedeemed,
    });
  } catch (e) {
    console.error("GET /api/gift-card-analytics error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju analitike kartic" }, { status: 500 });
  }
}
