import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/nutrition-calculator — prehranske vrednosti menija
// Podpora za ?menuItemId=xxx (posamezna jed) ali ?category=xxx
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const menuItemId = req.nextUrl.searchParams.get("menuItemId");
    const category = req.nextUrl.searchParams.get("category");

    const where: { restaurantId: string; id?: string; category?: string } = {
      restaurantId: tenant.id,
    };
    if (menuItemId) where.id = menuItemId;
    if (category && category !== "all") where.category = category;

    const menuItems = await db.menuItem.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    const items = menuItems.map((item) => {
      const calories = item.calories || 0;
      const protein = item.protein || 0;
      const carbs = item.carbs || 0;
      const fat = item.fat || 0;

      // Izračun kalorij iz makrohranil (če manjkajo)
      const calculatedCalories = protein * 4 + carbs * 4 + fat * 9;
      const finalCalories = calories > 0 ? calories : Math.round(calculatedCalories);

      // Deleži makrohranil (kalorijski prispevek)
      const proteinCalories = protein * 4;
      const carbsCalories = carbs * 4;
      const fatCalories = fat * 9;
      const totalMacroCalories = proteinCalories + carbsCalories + fatCalories;

      const proteinPercent = totalMacroCalories > 0 ? (proteinCalories / totalMacroCalories) * 100 : 0;
      const carbsPercent = totalMacroCalories > 0 ? (carbsCalories / totalMacroCalories) * 100 : 0;
      const fatPercent = totalMacroCalories > 0 ? (fatCalories / totalMacroCalories) * 100 : 0;

      // Prehranska ocena
      let healthScore: "healthy" | "moderate" | "high" = "moderate";
      if (finalCalories < 400 && fat < 20 && protein > 10) healthScore = "healthy";
      else if (finalCalories > 800 || fat > 40) healthScore = "high";

      // Priporočila
      let recommendations: string[] = [];
      if (calories === null || calories === 0) {
        recommendations.push("Manjkajo podatki o kalorijah — dodaj za natančno analizo");
      }
      if (protein === null || protein === 0) {
        recommendations.push("Brez podatkov o beljakovinah");
      }
      if (fat > 30) {
        recommendations.push("Visoka vsebnost maščob — razmisli o alternativah");
      }
      if (carbs > 60) {
        recommendations.push("Visoka vsebnost ogljikovih hidratov");
      }

      return {
        id: item.id,
        name: item.name,
        nameEn: item.nameEn,
        category: item.category,
        price: item.price,
        available: item.available,
        calories: finalCalories,
        originalCalories: item.calories,
        protein,
        carbs,
        fat,
        // Kalorijski prispevek
        proteinCalories,
        carbsCalories,
        fatCalories,
        // Deleži
        proteinPercent,
        carbsPercent,
        fatPercent,
        // Cena na 100 kcal
        pricePer100kcal: finalCalories > 0 ? (item.price / finalCalories) * 100 : 0,
        healthScore,
        recommendations,
        hasNutritionData: !!(item.calories || item.protein || item.carbs || item.fat),
      };
    });

    // Agregacija po kategorijah
    const categoryMap = new Map<
      string,
      {
        category: string;
        count: number;
        avgCalories: number;
        avgProtein: number;
        avgCarbs: number;
        avgFat: number;
        totalCalories: number;
      }
    >();

    for (const item of items) {
      const existing = categoryMap.get(item.category);
      if (existing) {
        existing.count++;
        existing.totalCalories += item.calories;
        existing.avgCalories = existing.totalCalories / existing.count;
        existing.avgProtein += item.protein;
        existing.avgCarbs += item.carbs;
        existing.avgFat += item.fat;
      } else {
        categoryMap.set(item.category, {
          category: item.category,
          count: 1,
          totalCalories: item.calories,
          avgCalories: item.calories,
          avgProtein: item.protein,
          avgCarbs: item.carbs,
          avgFat: item.fat,
        });
      }
    }

    // Popravi povprečja
    for (const c of categoryMap.values()) {
      c.avgProtein = c.avgProtein / c.count;
      c.avgCarbs = c.avgCarbs / c.count;
      c.avgFat = c.avgFat / c.count;
    }

    // Povzetek
    const totalCalories = items.reduce((s, i) => s + i.calories, 0);
    const totalProtein = items.reduce((s, i) => s + i.protein, 0);
    const totalCarbs = items.reduce((s, i) => s + i.carbs, 0);
    const totalFat = items.reduce((s, i) => s + i.fat, 0);

    const summary = {
      totalItems: items.length,
      itemsWithNutrition: items.filter((i) => i.hasNutritionData).length,
      itemsWithoutNutrition: items.filter((i) => !i.hasNutritionData).length,
      avgCalories: items.length > 0 ? totalCalories / items.length : 0,
      avgProtein: items.length > 0 ? totalProtein / items.length : 0,
      avgCarbs: items.length > 0 ? totalCarbs / items.length : 0,
      avgFat: items.length > 0 ? totalFat / items.length : 0,
      healthyCount: items.filter((i) => i.healthScore === "healthy").length,
      moderateCount: items.filter((i) => i.healthScore === "moderate").length,
      highCount: items.filter((i) => i.healthScore === "high").length,
      // Dnevne referenčne vrednosti (EU)
      dailyReference: {
        calories: 2000, // kcal
        protein: 50, // g
        carbs: 260, // g
        fat: 70, // g
      },
    };

    // Top jedi po kalorijah
    const highestCalorie = [...items]
      .filter((i) => i.calories > 0)
      .sort((a, b) => b.calories - a.calories)
      .slice(0, 5);

    const lowestCalorie = [...items]
      .filter((i) => i.calories > 0)
      .sort((a, b) => a.calories - b.calories)
      .slice(0, 5);

    const highestProtein = [...items]
      .filter((i) => i.protein > 0)
      .sort((a, b) => b.protein - a.protein)
      .slice(0, 5);

    return NextResponse.json({
      items,
      categorySummary: Array.from(categoryMap.values()),
      summary,
      highestCalorie,
      lowestCalorie,
      highestProtein,
    });
  } catch (e) {
    console.error("GET /api/nutrition-calculator error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju prehranskih vrednosti" }, { status: 500 });
  }
}
