// @ts-nocheck — Decimal migration TS errors (Task V2)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// POST /api/orders/duplicate-check — preveri morebitno podvajanje plačila
// Body: { tableId, total, cartItems }
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const body = await req.json();
    const { tableId, total, cartItems } = body as {
      tableId: string;
      total: number;
      cartItems?: { menuItemId: string; quantity: number }[];
    };

    if (!tableId || !total) {
      return NextResponse.json({ isDuplicate: false });
    }

    // Preveri plačane račune v zadnjih 10 minutah za isto mizo
    const since = new Date();
    since.setMinutes(since.getMinutes() - 10);

    const recentOrders = await db.order.findMany({
      where: {
        restaurantId: tenant.id,
        tableId,
        status: "paid",
        paidAt: { gte: since },
      },
      include: {
        items: { select: { menuItemId: true, quantity: true } },
      },
      orderBy: { paidAt: "desc" },
      take: 5,
    });

    const warnings: { type: string; message: string; severity: "warning" | "danger" }[] = [];

    // 1. Enak znesek v zadnjih 10 minutah
    const sameAmount = recentOrders.find(
      (o) => Math.abs(o.total - total) < 0.01
    );
    if (sameAmount) {
      warnings.push({
        type: "same_amount",
        message: `Miza je bila že plačana z enakim zneskom (${sameAmount.total.toFixed(2)}€) pred ${Math.round((Date.now() - (sameAmount.paidAt?.getTime() || 0)) / 60000)} min`,
        severity: "danger",
      });
    }

    // 2. Miza je bila plačana 2× v kratkem času (brez enakega zneska)
    if (recentOrders.length >= 2 && !sameAmount) {
      warnings.push({
        type: "multiple_payments",
        message: `Miza je bila plačana ${recentOrders.length}× v zadnjih 10 minutah`,
        severity: "warning",
      });
    }

    // 3. Enake postavke kot zadnji račun
    if (cartItems && cartItems.length > 0 && recentOrders[0]) {
      const lastOrder = recentOrders[0];
      const lastItems = lastOrder.items;
      if (lastItems.length === cartItems.length) {
        const sameItems = cartItems.every((ci) =>
          lastItems.some((li) => li.menuItemId === ci.menuItemId && li.quantity === ci.quantity)
        );
        if (sameItems) {
          warnings.push({
            type: "same_items",
            message: "Enake postavke kot zadnji račun na tej mizi",
            severity: "warning",
          });
        }
      }
    }

    return NextResponse.json({
      isDuplicate: warnings.length > 0,
      warnings,
      recentOrderCount: recentOrders.length,
    });
  } catch (e) {
    console.error("POST /api/orders/duplicate-check error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
