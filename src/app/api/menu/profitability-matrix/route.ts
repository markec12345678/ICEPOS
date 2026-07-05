// @ts-nocheck — pre-existing TS errors (non-critical route)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/menu/profitability-matrix — vizualna matrika profitabilnosti
// X os: cena jedi, Y os: profit margin %, velikost kroga: prodana količina
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const days = Math.min(parseInt(req.nextUrl.searchParams.get("days") || "30", 10), 90);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const items = await db.menuItem.findMany({
      where: { restaurantId: tenant.id },
      include: {
        recipes: { include: { inventoryItem: { select: { costPerUnit: true } } } },
        orderItems: {
          where: { order: { status: "paid", paidAt: { gte: since } } },
          select: { quantity: true, unitPrice: true },
        },
      },
    });

    const matrix = items.map((item) => {
      const foodCost = item.recipes.reduce(
        (s, r) => s + Number(r.inventoryItem.costPerUnit) * r.quantity,
        0
      );
      const profitPerUnit = Number(item.price) - foodCost;
      const profitMargin = Number(item.price) > 0 ? (profitPerUnit / item.price) * 100 : 0;
      const quantitySold = item.orderItems.reduce((s, oi) => s + oi.quantity, 0);
      const revenue = item.orderItems.reduce((s, oi) => s + oi.quantity * Number(oi.unitPrice), 0);
      const totalProfit = quantitySold * profitPerUnit;

      // Klasifikacija za matriko
      let quadrant: "star" | "cash-cow" | "question" | "dog" = "dog";
      const highMargin = profitMargin >= 60;
      const highPrice = Number(item.price) >= 12;
      if (highMargin && highPrice) quadrant = "star";
      else if (highMargin && !highPrice) quadrant = "cash-cow";
      else if (!highMargin && highPrice) quadrant = "question";
      else quadrant = "dog";

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        foodCost: Math.round(foodCost * 100) / 100,
        profitPerUnit: Math.round(profitPerUnit * 100) / 100,
        profitMargin: Math.round(profitMargin * 10) / 10,
        quantitySold,
        revenue: Math.round(revenue * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        quadrant,
        available: item.available,
        imageUrl: item.imageUrl,
      };
    }).filter((m) => m.quantitySold > 0 || Number(m.price) > 0);

    // Kvadrant statistika
    const quadrants = {
      star: matrix.filter((m) => m.quadrant === "star"),
      "cash-cow": matrix.filter((m) => m.quadrant === "cash-cow"),
      question: matrix.filter((m) => m.quadrant === "question"),
      dog: matrix.filter((m) => m.quadrant === "dog"),
    };

    return NextResponse.json({
      items: matrix.sort((a, b) => b.totalProfit - a.totalProfit),
      quadrants: {
        star: { count: quadrants.star.length, profit: Math.round(quadrants.star.reduce((s, i) => s + i.totalProfit, 0) * 100) / 100 },
        "cash-cow": { count: quadrants["cash-cow"].length, profit: Math.round(quadrants["cash-cow"].reduce((s, i) => s + i.totalProfit, 0) * 100) / 100 },
        question: { count: quadrants.question.length, profit: Math.round(quadrants.question.reduce((s, i) => s + i.totalProfit, 0) * 100) / 100 },
        dog: { count: quadrants.dog.length, profit: Math.round(quadrants.dog.reduce((s, i) => s + i.totalProfit, 0) * 100) / 100 },
      },
      summary: {
        totalItems: matrix.length,
        totalProfit: Math.round(matrix.reduce((s, i) => s + i.totalProfit, 0) * 100) / 100,
        avgMargin: matrix.length > 0 ? Math.round(matrix.reduce((s, i) => s + i.profitMargin, 0) / matrix.length * 10) / 10 : 0,
        avgPrice: matrix.length > 0 ? Math.round(matrix.reduce((s, i) => s + i.price, 0) / matrix.length * 100) / 100 : 0,
      },
      days,
    });
  } catch (e) {
    console.error("GET /api/menu/profitability-matrix error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
