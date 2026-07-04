import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/inventory/exppiry — artikli z rokom trajanja
// Vrne: expired, expiring soon (3 dni), expiring this week
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const items = await db.inventoryItem.findMany({
      where: {
        restaurantId: tenant.id,
        expiryDate: { not: null },
      },
      orderBy: { expiryDate: "asc" },
    });

    const now = new Date();
    const threeDays = new Date();
    threeDays.setDate(threeDays.getDate() + 3);
    const week = new Date();
    week.setDate(week.getDate() + 7);

    const expired: typeof items = [];
    const expiringSoon: typeof items = [];
    const expiringWeek: typeof items = [];
    const safe: typeof items = [];

    for (const item of items) {
      if (!item.expiryDate) continue;
      const expiry = new Date(item.expiryDate);

      if (expiry < now) {
        expired.push(item);
      } else if (expiry <= threeDays) {
        expiringSoon.push(item);
      } else if (expiry <= week) {
        expiringWeek.push(item);
      } else {
        safe.push(item);
      }
    }

    // Izračun vrednosti izgub (expired)
    const expiredValue = expired.reduce((s, i) => s + i.quantity * i.costPerUnit, 0);
    const expiringSoonValue = expiringSoon.reduce((s, i) => s + i.quantity * i.costPerUnit, 0);

    return NextResponse.json({
      summary: {
        total: items.length,
        expired: expired.length,
        expiringSoon: expiringSoon.length,
        expiringWeek: expiringWeek.length,
        safe: safe.length,
        expiredValue: Math.round(expiredValue * 100) / 100,
        expiringSoonValue: Math.round(expiringSoonValue * 100) / 100,
      },
      expired: expired.map((i) => ({
        id: i.id,
        name: i.name,
        unit: i.unit,
        quantity: i.quantity,
        costPerUnit: i.costPerUnit,
        expiryDate: i.expiryDate!.toISOString(),
        batchNumber: i.batchNumber,
        category: i.category,
        daysOverdue: Math.floor((now.getTime() - i.expiryDate!.getTime()) / 86400000),
        value: Math.round(i.quantity * i.costPerUnit * 100) / 100,
      })),
      expiringSoon: expiringSoon.map((i) => ({
        id: i.id,
        name: i.name,
        unit: i.unit,
        quantity: i.quantity,
        costPerUnit: i.costPerUnit,
        expiryDate: i.expiryDate!.toISOString(),
        batchNumber: i.batchNumber,
        category: i.category,
        daysUntil: Math.ceil((new Date(i.expiryDate!).getTime() - now.getTime()) / 86400000),
        value: Math.round(i.quantity * i.costPerUnit * 100) / 100,
      })),
      expiringWeek: expiringWeek.map((i) => ({
        id: i.id,
        name: i.name,
        unit: i.unit,
        quantity: i.quantity,
        costPerUnit: i.costPerUnit,
        expiryDate: i.expiryDate!.toISOString(),
        batchNumber: i.batchNumber,
        category: i.category,
        daysUntil: Math.ceil((new Date(i.expiryDate!).getTime() - now.getTime()) / 86400000),
        value: Math.round(i.quantity * i.costPerUnit * 100) / 100,
      })),
    });
  } catch (e) {
    console.error("GET /api/inventory/expiry error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
