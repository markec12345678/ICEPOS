import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validate, CreateFeedbackSchema } from "@/lib/validation";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/feedback?days=30 — seznam povratnih informacij
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const days = parseInt(req.nextUrl.searchParams.get("days") || "30", 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const feedbacks = await db.feedback.findMany({
      where: {
        restaurantId: tenant.id,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
    });

    // Agregirane metrike
    const total = feedbacks.length;
    const avgFood = total > 0 ? feedbacks.reduce((s, f) => s + f.foodRating, 0) / total : 0;
    const avgService = total > 0 ? feedbacks.reduce((s, f) => s + f.serviceRating, 0) / total : 0;
    const avgOverall = total > 0 ? feedbacks.reduce((s, f) => s + f.overallRating, 0) / total : 0;

    // Distribucija ocen (1-5 zvezdic)
    const ratingDistribution = [1, 2, 3, 4, 5].map((stars) => ({
      stars,
      count: feedbacks.filter((f) => f.overallRating === stars).length,
    }));

    // Nereseni feedback-i
    const unresolved = feedbacks.filter((f) => !f.resolved).length;

    // Tag analitika
    const tagCounts: Record<string, number> = {};
    feedbacks.forEach((f) => {
      if (f.tags) {
        try {
          const tags = JSON.parse(f.tags) as string[];
          tags.forEach((t) => {
            tagCounts[t] = (tagCounts[t] || 0) + 1;
          });
        } catch {
          // ignore
        }
      }
    });
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    // Trend (zadnjih 7 dni vs prejšnjih 7 dni)
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const prev7Days = new Date();
    prev7Days.setDate(prev7Days.getDate() - 14);

    const recentFeedbacks = feedbacks.filter((f) => new Date(f.createdAt) >= last7Days);
    const olderFeedbacks = feedbacks.filter((f) => {
      const d = new Date(f.createdAt);
      return d >= prev7Days && d < last7Days;
    });

    const recentAvg = recentFeedbacks.length > 0
      ? recentFeedbacks.reduce((s, f) => s + f.overallRating, 0) / recentFeedbacks.length
      : 0;
    const olderAvg = olderFeedbacks.length > 0
      ? olderFeedbacks.reduce((s, f) => s + f.overallRating, 0) / olderFeedbacks.length
      : 0;
    const trend = recentAvg - olderAvg;

    return NextResponse.json({
      feedbacks,
      summary: {
        total,
        avgFood: Math.round(avgFood * 10) / 10,
        avgService: Math.round(avgService * 10) / 10,
        avgOverall: Math.round(avgOverall * 10) / 10,
        unresolved,
        ratingDistribution,
        topTags,
        trend: Math.round(trend * 10) / 10,
        recentAvg: Math.round(recentAvg * 10) / 10,
      },
      days,
    });
  } catch (e) {
    console.error("GET /api/feedback error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// POST /api/feedback — ustvari novo povratno informacijo
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = validate(CreateFeedbackSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Neveljaven vhod", details: parsed.error }, { status: 400 });
    }
    const {
      orderId,
      customerId,
      customerName,
      foodRating,
      serviceRating,
      ambienceRating,
      overallRating,
      comment,
      tags,
    } = body;

    // Validacija
    if (!foodRating || !serviceRating || !overallRating) {
      return NextResponse.json(
        { error: "Manjkajo obvezne ocene (foodRating, serviceRating, overallRating)" },
        { status: 400 }
      );
    }

    if (foodRating < 1 || foodRating > 5 || serviceRating < 1 || serviceRating > 5 || overallRating < 1 || overallRating > 5) {
      return NextResponse.json(
        { error: "Ocene morajo biti med 1 in 5" },
        { status: 400 }
      );
    }

    const feedback = await db.feedback.create({
      data: {
        restaurantId: tenant.id,
        orderId: orderId || null,
        customerId: customerId || null,
        customerName: customerName || null,
        foodRating: parseInt(foodRating, 10),
        serviceRating: parseInt(serviceRating, 10),
        ambienceRating: ambienceRating ? parseInt(ambienceRating, 10) : null,
        overallRating: parseInt(overallRating, 10),
        comment: comment || null,
        tags: tags ? JSON.stringify(tags) : null,
      },
    });

    return NextResponse.json(feedback, { status: 201 });
  } catch (e) {
    console.error("POST /api/feedback error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
