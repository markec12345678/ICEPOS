import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// POST /api/menu/bulk-price — množično posodabljanje cen
// Body: { items: [{ id, price }], applyVat?: boolean }
// ALI: { category, adjustment: { type: "percent" | "fixed", value: number } }
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const body = await req.json();
    const { items, category, adjustment } = body as {
      items?: { id: string; price: number }[];
      category?: string;
      adjustment?: { type: "percent" | "fixed"; value: number; direction: "increase" | "decrease" };
    };

    let updated = 0;
    let totalDifference = 0;

    if (items && Array.isArray(items)) {
      // Način 1: eksplicitne cene per item
      for (const item of items) {
        if (!item.id || typeof item.price !== "number") continue;
        const existing = await db.menuItem.findFirst({
          where: { id: item.id, restaurantId: tenant.id },
          select: { price: true, name: true },
        });
        if (!existing) continue;

        const diff = item.price - existing.price;
        totalDifference += diff;

        await db.menuItem.update({
          where: { id: item.id },
          data: { price: item.price },
        });
        updated++;
      }
    } else if (category && adjustment) {
      // Način 2: kategorija + prilagoditev (procent ali fiksno)
      const menuItems = await db.menuItem.findMany({
        where: { restaurantId: tenant.id, category },
        select: { id: true, price: true, name: true },
      });

      for (const item of menuItems) {
        let newPrice = item.price;
        if (adjustment.type === "percent") {
          const change = item.price * (adjustment.value / 100);
          newPrice = adjustment.direction === "increase"
            ? item.price + change
            : item.price - change;
        } else {
          // fixed
          newPrice = adjustment.direction === "increase"
            ? item.price + adjustment.value
            : Math.max(0, item.price - adjustment.value);
        }
        newPrice = Math.round(newPrice * 100) / 100;

        const diff = newPrice - item.price;
        totalDifference += diff;

        await db.menuItem.update({
          where: { id: item.id },
          data: { price: newPrice },
        });
        updated++;
      }
    } else {
      return NextResponse.json(
        { error: "Manjkajoči parametri (items ali category+adjustment)" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      updated,
      totalDifference: Math.round(totalDifference * 100) / 100,
      message: `${updated} postavk posodobljenih`,
    });
  } catch (e) {
    console.error("POST /api/menu/bulk-price error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
