// ============================================================
// Happy Hour lib — izračun časovno odvisnih popustov
// ============================================================
// Preveri ali je za trenutni čas aktiven happy hour in
// izračuna popust za določen item.
// ============================================================

import { db } from "./db";
import type { MenuItem } from "./types";

export interface ActiveHappyHour {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  discountType: "percent" | "fixed";
  discountValue: number;
}

export interface HappyHourCalculation {
  hasDiscount: boolean;
  happyHour?: ActiveHappyHour;
  originalPrice: number;
  discountedPrice: number;
  discountAmount: number;
}

// Preveri ali je danes aktiven happy hour ob danem času
export async function getActiveHappyHours(
  restaurantId: string,
  now: Date = new Date()
): Promise<ActiveHappyHour[]> {
  const dayOfWeek = now.getDay(); // 0=ned, 1=pon, ..., 6=sob
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const allHappyHours = await db.happyHour.findMany({
    where: { restaurantId, active: true },
  });

  return allHappyHours.filter((hh) => {
    // Preveri dan v tednu
    let days: number[];
    try {
      days = JSON.parse(hh.daysOfWeek);
    } catch {
      days = [1, 2, 3, 4, 5]; // privzeto pon-pet
    }
    if (!days.includes(dayOfWeek)) return false;

    // Preveri čas
    return currentTime >= hh.startTime && currentTime < hh.endTime;
  }).map((hh) => ({
    id: hh.id,
    name: hh.name,
    startTime: hh.startTime,
    endTime: hh.endTime,
    discountType: hh.discountType as "percent" | "fixed",
    discountValue: hh.discountValue,
  }));
}

// Izračunaj ceno za item z upoštevanjem happy hour popustov
export function calculateHappyHourPrice(
  item: MenuItem,
  happyHours: ActiveHappyHour[]
): HappyHourCalculation {
  const originalPrice = item.price;

  if (happyHours.length === 0) {
    return {
      hasDiscount: false,
      originalPrice,
      discountedPrice: originalPrice,
      discountAmount: 0,
    };
  }

  // Najdi prvi happy hour ki velja za ta item
  for (const hh of happyHours) {
    // Preveri ali velja za to kategorijo
    // (Za pocenitev preverjamo v getActiveHappyHoursForItem)
    let discountedPrice = originalPrice;
    if (hh.discountType === "percent") {
      discountedPrice = originalPrice * (1 - hh.discountValue / 100);
    } else if (hh.discountType === "fixed") {
      discountedPrice = Math.max(0, originalPrice - hh.discountValue);
    }
    discountedPrice = Math.round(discountedPrice * 100) / 100;

    return {
      hasDiscount: true,
      happyHour: hh,
      originalPrice,
      discountedPrice,
      discountAmount: Math.round((originalPrice - discountedPrice) * 100) / 100,
    };
  }

  return {
    hasDiscount: false,
    originalPrice,
    discountedPrice: originalPrice,
    discountAmount: 0,
  };
}

// Preveri ali happy hour velja za določen item (glede na categories/menuItemIds)
export function happyHourAppliesToItem(
  hh: { categories: string; menuItemIds: string },
  item: MenuItem
): boolean {
  // Preveri kategorije
  if (hh.categories !== "all") {
    try {
      const cats: string[] = JSON.parse(hh.categories);
      if (cats.length > 0 && !cats.includes(item.category)) return false;
    } catch {
      // ignore
    }
  }

  // Preveri specifične item-e
  if (hh.menuItemIds !== "all") {
    try {
      const ids: string[] = JSON.parse(hh.menuItemIds);
      if (ids.length > 0 && !ids.includes(item.id)) return false;
    } catch {
      // ignore
    }
  }

  return true;
}
