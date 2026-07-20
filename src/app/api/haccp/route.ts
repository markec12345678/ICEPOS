import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/haccp — seznam HACCP pregledov
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const statusFilter = req.nextUrl.searchParams.get("status");

    const where: { restaurantId: string; status?: string } = { restaurantId: tenant.id };
    if (statusFilter && statusFilter !== "all") {
      where.status = statusFilter;
    }

    const inspections = await db.haccpInspection.findMany({
      where,
      orderBy: { inspectionDate: "desc" },
    });

    const now = new Date();
    const soonThreshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const summary = {
      total: inspections.length,
      passed: inspections.filter((i) => i.status === "passed").length,
      conditional: inspections.filter((i) => i.status === "conditional").length,
      failed: inspections.filter((i) => i.status === "failed").length,
      avgScore: inspections.length > 0
        ? inspections.reduce((s, i) => s + i.overallScore, 0) / inspections.length
        : 0,
      upcomingInspections: inspections.filter(
        (i) => i.nextInspectionDate && i.nextInspectionDate <= soonThreshold && i.nextInspectionDate >= now
      ).length,
      overdueInspections: inspections.filter(
        (i) => i.nextInspectionDate && i.nextInspectionDate < now
      ).length,
    };

    return NextResponse.json({
      inspections: inspections.map((i) => ({
        ...i,
        inspectionDate: i.inspectionDate.toISOString(),
        nextInspectionDate: i.nextInspectionDate?.toISOString() || null,
        createdAt: i.createdAt.toISOString(),
      })),
      summary,
    });
  } catch (e) {
    console.error("GET /api/haccp error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju pregledov" }, { status: 500 });
  }
}

// POST /api/haccp — dodaj nov pregled
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko dodaja HACCP preglede" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      type,
      inspector,
      inspectionDate,
      nextInspectionDate,
      cleanlinessScore,
      foodHandlingScore,
      storageScore,
      temperatureScore,
      documentationScore,
      pestControlScore,
      findings,
      recommendations,
      correctiveActions,
      note,
    } = body as {
      type: string;
      inspector?: string;
      inspectionDate?: string;
      nextInspectionDate?: string;
      cleanlinessScore?: number;
      foodHandlingScore?: number;
      storageScore?: number;
      temperatureScore?: number;
      documentationScore?: number;
      pestControlScore?: number;
      findings?: string;
      recommendations?: string;
      correctiveActions?: string;
      note?: string;
    };

    if (!type) {
      return NextResponse.json({ error: "Tip je obvezen" }, { status: 400 });
    }

    const scores = {
      cleanlinessScore: cleanlinessScore ?? 5,
      foodHandlingScore: foodHandlingScore ?? 5,
      storageScore: storageScore ?? 5,
      temperatureScore: temperatureScore ?? 5,
      documentationScore: documentationScore ?? 5,
      pestControlScore: pestControlScore ?? 5,
    };

    const overallScore =
      (scores.cleanlinessScore + scores.foodHandlingScore + scores.storageScore +
        scores.temperatureScore + scores.documentationScore + scores.pestControlScore) / 6;

    // Samodejno določi status glede na oceno
    let status: "passed" | "conditional" | "failed" = "passed";
    if (overallScore < 3) status = "failed";
    else if (overallScore < 4) status = "conditional";

    const inspection = await db.haccpInspection.create({
      data: {
        restaurantId: tenant.id,
        type,
        inspector: inspector || null,
        inspectionDate: inspectionDate ? new Date(inspectionDate) : new Date(),
        nextInspectionDate: nextInspectionDate ? new Date(nextInspectionDate) : null,
        ...scores,
        overallScore: Math.round(overallScore * 100) / 100,
        status,
        findings: findings || null,
        recommendations: recommendations || null,
        correctiveActions: correctiveActions || null,
        note: note || null,
      },
    });

    return NextResponse.json(inspection, { status: 201 });
  } catch (e) {
    console.error("POST /api/haccp error:", e);
    return NextResponse.json({ error: "Napaka pri dodajanju pregleda" }, { status: 500 });
  }
}
