import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/feedback-dashboard — napredna analitika povratnih informacij
// Podpora za ?from=&to=&resolved=
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    const resolvedFilter = req.nextUrl.searchParams.get("resolved");

    const now = new Date();
    const startDate = from ? new Date(from + "T00:00:00") : new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to + "T23:59:59") : now;

    const where: {
      restaurantId: string;
      createdAt?: { gte: Date; lte: Date };
      resolved?: boolean;
    } = {
      restaurantId: tenant.id,
      createdAt: { gte: startDate, lte: endDate },
    };

    if (resolvedFilter === "resolved") where.resolved = true;
    if (resolvedFilter === "unresolved") where.resolved = false;

    const feedbacks = await db.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    // Osnovne metrike
    const total = feedbacks.length;
    const resolved = feedbacks.filter((f) => f.resolved).length;
    const unresolved = total - resolved;

    // Povprečne ocene
    const avgFoodRating = total > 0 ? feedbacks.reduce((s, f) => s + f.foodRating, 0) / total : 0;
    const avgServiceRating = total > 0 ? feedbacks.reduce((s, f) => s + f.serviceRating, 0) / total : 0;
    const avgAmbienceRating = feedbacks.filter((f) => f.ambienceRating !== null).length > 0
      ? feedbacks.filter((f) => f.ambienceRating !== null).reduce((s, f) => s + (f.ambienceRating || 0), 0) / feedbacks.filter((f) => f.ambienceRating !== null).length
      : 0;
    const avgOverall = total > 0 ? feedbacks.reduce((s, f) => s + f.overallRating, 0) / total : 0;

    // Distribucija ocen (1-5 zvezdic)
    const ratingDistribution = [1, 2, 3, 4, 5].map((star) => ({
      star,
      count: feedbacks.filter((f) => f.overallRating === star).length,
      percentage: total > 0 ? (feedbacks.filter((f) => f.overallRating === star).length / total) * 100 : 0,
    }));

    // NPS kalkulacija (Promoters 9-10, Passives 7-8, Detractors 0-6)
    // Za 5-zvezdiščno lestvico: 5 = Promoter, 4 = Passive, 1-3 = Detractor
    const promoters = feedbacks.filter((f) => f.overallRating === 5).length;
    const passives = feedbacks.filter((f) => f.overallRating === 4).length;
    const detractors = feedbacks.filter((f) => f.overallRating <= 3).length;
    const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

    // Analiza tagov (pozitivni in negativni)
    const tagMap = new Map<string, number>();
    for (const f of feedbacks) {
      if (f.tags) {
        try {
          const tags = JSON.parse(f.tags) as string[];
          for (const tag of tags) {
            tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
          }
        } catch {
          // ignore
        }
      }
    }

    const POSITIVE_TAGS = ["fast_service", "delicious", "friendly_staff", "clean", "great_atmosphere", "good_value", "fresh_food", "generous_portions"];
    const NEGATIVE_TAGS = ["slow_service", "cold_food", "rude_staff", "dirty", "overpriced", "small_portions", "bland", "undercooked"];

    const positiveTags = Array.from(tagMap.entries())
      .filter(([tag]) => POSITIVE_TAGS.includes(tag))
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    const negativeTags = Array.from(tagMap.entries())
      .filter(([tag]) => NEGATIVE_TAGS.includes(tag))
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    // Mesečni trend
    const monthlyMap = new Map<
      string,
      { month: string; count: number; avgRating: number; totalRating: number }
    >();

    for (const f of feedbacks) {
      const monthKey = f.createdAt.toISOString().slice(0, 7);
      const existing = monthlyMap.get(monthKey);
      if (existing) {
        existing.count++;
        existing.totalRating += f.overallRating;
        existing.avgRating = existing.totalRating / existing.count;
      } else {
        monthlyMap.set(monthKey, {
          month: monthKey,
          count: 1,
          totalRating: f.overallRating,
          avgRating: f.overallRating,
        });
      }
    }

    // Komentarji z nizkimi ocenami (prioriteta za odgovor)
    const lowRated = feedbacks
      .filter((f) => f.overallRating <= 3 && !f.resolved)
      .sort((a, b) => a.overallRating - b.overallRating)
      .slice(0, 10)
      .map((f) => ({
        id: f.id,
        customerName: f.customerName,
        foodRating: f.foodRating,
        serviceRating: f.serviceRating,
        overallRating: f.overallRating,
        comment: f.comment,
        tags: f.tags,
        createdAt: f.createdAt.toISOString(),
      }));

    // Najnovejše (za prikaz)
    const recent = feedbacks.slice(0, 10).map((f) => ({
      id: f.id,
      customerName: f.customerName,
      foodRating: f.foodRating,
      serviceRating: f.serviceRating,
      ambienceRating: f.ambienceRating,
      overallRating: f.overallRating,
      comment: f.comment,
      tags: f.tags,
      resolved: f.resolved,
      response: f.response,
      createdAt: f.createdAt.toISOString(),
    }));

    return NextResponse.json({
      period: {
        from: startDate.toISOString().slice(0, 10),
        to: endDate.toISOString().slice(0, 10),
      },
      summary: {
        total,
        resolved,
        unresolved,
        resolutionRate: total > 0 ? (resolved / total) * 100 : 0,
        avgFoodRating,
        avgServiceRating,
        avgAmbienceRating,
        avgOverall,
        nps,
        promoters,
        passives,
        detractors,
      },
      ratingDistribution,
      positiveTags,
      negativeTags,
      monthly: Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
      lowRated,
      recent,
    });
  } catch (e) {
    console.error("GET /api/feedback-dashboard error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju analitike povratnih informacij" }, { status: 500 });
  }
}
