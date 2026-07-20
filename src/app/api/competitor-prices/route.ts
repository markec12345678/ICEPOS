import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/competitor-prices — sledenje cen konkurence
// Primerjava lastnih cen s cenami konkurentov
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    // Pridobi vse meni item-e
    const menuItems = await db.menuItem.findMany({
      where: { restaurantId: tenant.id },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // Generiraj demo podatke o cenah konkurentov
    // (v produkciji bi to prihajalo iz dedicated tabele/API-jev)
    const competitors = ["Gostilna Pri Ani", "Restavracija Loka", "Pivnica Stara Ljubljana"];

    const items = menuItems.map((item) => {
      // Generiraj simulirane cene konkurentov (±20% od naše cene)
      const competitorPrices = competitors.map((comp) => {
        const variation = (Math.random() - 0.5) * 0.4; // ±20%
        const price = Math.round(item.price * (1 + variation) * 100) / 100;
        return {
          competitor: comp,
          price,
          difference: Math.round((price - item.price) * 100) / 100,
          differencePercent: Math.round(((price - item.price) / item.price) * 1000) / 10,
        };
      });

      const avgCompetitorPrice =
        competitorPrices.reduce((s, c) => s + c.price, 0) / competitorPrices.length;
      const minCompetitorPrice = Math.min(...competitorPrices.map((c) => c.price));
      const maxCompetitorPrice = Math.max(...competitorPrices.map((c) => c.price));

      const ourPriceVsAvg = Math.round(((item.price - avgCompetitorPrice) / avgCompetitorPrice) * 1000) / 10;
      const ourPriceVsMin = Math.round(((item.price - minCompetitorPrice) / minCompetitorPrice) * 1000) / 10;

      let pricePosition: "below" | "average" | "above" = "average";
      if (ourPriceVsAvg < -5) pricePosition = "below";
      else if (ourPriceVsAvg > 5) pricePosition = "above";

      return {
        menuItemId: item.id,
        name: item.name,
        category: item.category,
        ourPrice: item.price,
        competitorPrices,
        avgCompetitorPrice: Math.round(avgCompetitorPrice * 100) / 100,
        minCompetitorPrice,
        maxCompetitorPrice,
        ourPriceVsAvg,
        ourPriceVsMin,
        pricePosition,
        recommendation:
          pricePosition === "above"
            ? "Razmisli o znižanju cene"
            : pricePosition === "below"
            ? "Možnost povišanja cene"
            : "Cena je konkurenčna",
      };
    });

    // Povzetek
    const totalItems = items.length;
    const belowCount = items.filter((i) => i.pricePosition === "below").length;
    const averageCount = items.filter((i) => i.pricePosition === "average").length;
    const aboveCount = items.filter((i) => i.pricePosition === "above").length;

    const avgPriceDifference =
      totalItems > 0
        ? items.reduce((s, i) => s + i.ourPriceVsAvg, 0) / totalItems
        : 0;

    // Po kategorijah
    const categoryMap = new Map<
      string,
      {
        category: string;
        itemCount: number;
        avgOurPrice: number;
        avgCompetitorPrice: number;
        avgDifference: number;
      }
    >();

    for (const item of items) {
      const existing = categoryMap.get(item.category);
      if (existing) {
        existing.itemCount++;
        existing.avgOurPrice += item.ourPrice;
        existing.avgCompetitorPrice += item.avgCompetitorPrice;
        existing.avgDifference += item.ourPriceVsAvg;
      } else {
        categoryMap.set(item.category, {
          category: item.category,
          itemCount: 1,
          avgOurPrice: item.ourPrice,
          avgCompetitorPrice: item.avgCompetitorPrice,
          avgDifference: item.ourPriceVsAvg,
        });
      }
    }

    for (const c of categoryMap.values()) {
      c.avgOurPrice = c.avgOurPrice / c.itemCount;
      c.avgCompetitorPrice = c.avgCompetitorPrice / c.itemCount;
      c.avgDifference = c.avgDifference / c.itemCount;
    }

    return NextResponse.json({
      items,
      competitors,
      categorySummary: Array.from(categoryMap.values()),
      summary: {
        totalItems,
        belowCount,
        averageCount,
        aboveCount,
        avgPriceDifference,
      },
    });
  } catch (e) {
    console.error("GET /api/competitor-prices error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju cen konkurence" }, { status: 500 });
  }
}
