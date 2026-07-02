import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getActiveHappyHours, calculateHappyHourPrice, happyHourAppliesToItem } from "@/lib/happy-hour";
import type { MenuItem } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/happy-hours/active-prices — vrne trenutno aktivne Happy Hour cene za vse meni postavke
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const activeHappyHours = await getActiveHappyHours(tenant.id);

    if (activeHappyHours.length === 0) {
      return NextResponse.json({
        active: false,
        happyHours: [],
        items: [],
        message: "Happy Hour ni aktiven",
      });
    }

    // Pridobi vse meni postavke
    const menuItems = await db.menuItem.findMany({
      where: { restaurantId: tenant.id, available: true },
    });

    // Pridobi polne HappyHour podatke (z categories filter)
    const fullHappyHours = await Promise.all(
      activeHappyHours.map(async (hh) => {
        const full = await db.happyHour.findUnique({ where: { id: hh.id } });
        return {
          ...hh,
          categories: full?.categories || "all",
          menuItemIds: full?.menuItemIds || "all",
        };
      })
    );

    // Izračunaj cene za vsak item
    const itemsWithPrices = menuItems.map((item) => {
      const menuItem = item as unknown as MenuItem;
      // Preveri ali kateri HappyHour velja za ta item
      for (const hh of fullHappyHours) {
        if (happyHourAppliesToItem(hh, menuItem)) {
          const calc = calculateHappyHourPrice(menuItem, [hh]);
          if (calc.hasDiscount) {
            return {
              id: item.id,
              name: item.name,
              originalPrice: item.price,
              discountedPrice: calc.discountedPrice,
              discountAmount: calc.discountAmount,
              happyHourName: calc.happyHour?.name,
              hasDiscount: true,
            };
          }
        }
      }
      return {
        id: item.id,
        name: item.name,
        originalPrice: item.price,
        discountedPrice: item.price,
        discountAmount: 0,
        hasDiscount: false,
      };
    });

    const discountedItems = itemsWithPrices.filter((i) => i.hasDiscount);

    return NextResponse.json({
      active: true,
      happyHours: fullHappyHours.map((hh) => ({
        name: hh.name,
        startTime: hh.startTime,
        endTime: hh.endTime,
        discountType: hh.discountType,
        discountValue: hh.discountValue,
      })),
      items: itemsWithPrices,
      discountedCount: discountedItems.length,
      message: discountedItems.length > 0
        ? `Happy Hour aktiven! ${discountedItems.length} postavk s popustom`
        : "Happy Hour aktiven, vendar nobena postavka ne ustreza",
    });
  } catch (e) {
    console.error("GET /api/happy-hours/active-prices error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
