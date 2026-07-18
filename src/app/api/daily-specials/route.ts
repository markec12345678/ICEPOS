import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/daily-specials — vrne današnje specialitete
// Podpora za ?date=YYYY-MM-DD (privzeto danes)
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const dateParam = req.nextUrl.searchParams.get("date");
    const today = new Date();
    const todayStr = dateParam || today.toISOString().slice(0, 10);
    const dayOfWeek = dateParam
      ? new Date(dateParam + "T12:00:00").getDay()
      : today.getDay();

    // Vsi meni item-i, označeni kot dnevna specialiteta
    const specials = await db.menuItem.findMany({
      where: {
        restaurantId: tenant.id,
        isDailySpecial: true,
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // Vsi aktivni happy hour-ji (vplivajo na ceno)
    const happyHours = await db.happyHour.findMany({
      where: {
        restaurantId: tenant.id,
        active: true,
      },
    });

    // Preveri ali je kakšen happy hour aktiven zdaj
    const now = today;
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const activeHappyHours = happyHours.filter((hh) => {
      const days = JSON.parse(hh.daysOfWeek) as number[];
      return days.includes(dayOfWeek) && currentTime >= hh.startTime && currentTime <= hh.endTime;
    });

    const items = specials.map((item) => {
      let discountedPrice = item.price;
      let activeDiscount: string | null = null;

      // Aplimiraj aktivni happy hour na ceno
      for (const hh of activeHappyHours) {
        const cats = hh.categories === "all" ? null : (JSON.parse(hh.categories) as string[]);
        const ids = hh.menuItemIds === "all" ? null : (JSON.parse(hh.menuItemIds) as string[]);
        const applies =
          (!cats || cats.includes(item.category)) &&
          (!ids || ids.includes(item.id));
        if (applies) {
          if (hh.discountType === "percent") {
            discountedPrice = item.price * (1 - hh.discountValue / 100);
          } else {
            discountedPrice = Math.max(0, item.price - hh.discountValue);
          }
          activeDiscount = hh.name;
          break;
        }
      }

      return {
        id: item.id,
        name: item.name,
        nameEn: item.nameEn,
        category: item.category,
        price: item.price,
        discountedPrice,
        hasDiscount: discountedPrice < item.price,
        activeDiscount,
        available: item.available,
        desc: item.desc,
        imageUrl: item.imageUrl,
        calories: item.calories,
      };
    });

    return NextResponse.json({
      date: todayStr,
      dayOfWeek,
      activeHappyHours: activeHappyHours.map((hh) => ({
        id: hh.id,
        name: hh.name,
        startTime: hh.startTime,
        endTime: hh.endTime,
        discountType: hh.discountType,
        discountValue: hh.discountValue,
      })),
      items,
      summary: {
        totalSpecials: items.length,
        availableSpecials: items.filter((i) => i.available).length,
        discountedItems: items.filter((i) => i.hasDiscount).length,
      },
    });
  } catch (e) {
    console.error("GET /api/daily-specials error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju dnevnih specialitet" }, { status: 500 });
  }
}

// PATCH /api/daily-specials — označi/odznači meni item kot dnevna specialiteta
export async function PATCH(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const body = await req.json();
    const { menuItemId, isDailySpecial } = body as {
      menuItemId: string;
      isDailySpecial: boolean;
    };

    if (!menuItemId) {
      return NextResponse.json({ error: "menuItemId je obvezen" }, { status: 400 });
    }

    // Preveri lastništvo
    const item = await db.menuItem.findFirst({
      where: { id: menuItemId, restaurantId: tenant.id },
    });
    if (!item) {
      return NextResponse.json({ error: "Meni postavka ni najdena" }, { status: 404 });
    }

    const updated = await db.menuItem.update({
      where: { id: menuItemId },
      data: { isDailySpecial },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      isDailySpecial: updated.isDailySpecial,
    });
  } catch (e) {
    console.error("PATCH /api/daily-specials error:", e);
    return NextResponse.json({ error: "Napaka pri posodabljanju specialitete" }, { status: 500 });
  }
}
