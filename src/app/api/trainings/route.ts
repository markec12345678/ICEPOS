import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/trainings — seznam usposabljanj
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const statusFilter = req.nextUrl.searchParams.get("status");
    const categoryFilter = req.nextUrl.searchParams.get("category");
    const operatorId = req.nextUrl.searchParams.get("operatorId");

    const where: {
      restaurantId: string;
      status?: string;
      category?: string;
      operatorId?: string;
    } = { restaurantId: tenant.id };
    if (statusFilter && statusFilter !== "all") {
      where.status = statusFilter;
    }
    if (categoryFilter && categoryFilter !== "all") {
      where.category = categoryFilter;
    }
    if (operatorId) {
      where.operatorId = operatorId;
    }

    const trainings = await db.training.findMany({
      where,
      include: { operator: true },
      orderBy: { trainingDate: "desc" },
    });

    const now = new Date();

    const summary = {
      total: trainings.length,
      completed: trainings.filter((t) => t.status === "completed").length,
      scheduled: trainings.filter((t) => t.status === "scheduled").length,
      cancelled: trainings.filter((t) => t.status === "cancelled").length,
      expired: trainings.filter(
        (t) => t.status === "expired" || (t.validUntil && t.validUntil < now)
      ).length,
      passed: trainings.filter((t) => t.passed).length,
      avgScore: trainings.filter((t) => t.score !== null).length > 0
        ? trainings.filter((t) => t.score !== null).reduce((s, t) => s + (t.score || 0), 0) /
          trainings.filter((t) => t.score !== null).length
        : 0,
      totalCost: trainings.reduce((s, t) => s + t.cost, 0),
      totalHours: trainings.reduce((s, t) => s + t.durationHours, 0),
      expiringSoon: trainings.filter(
        (t) => t.validUntil && t.validUntil <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) && t.validUntil >= now
      ).length,
    };

    return NextResponse.json({
      trainings: trainings.map((t) => ({
        ...t,
        trainingDate: t.trainingDate.toISOString(),
        completedDate: t.completedDate?.toISOString() || null,
        validUntil: t.validUntil?.toISOString() || null,
        createdAt: t.createdAt.toISOString(),
        operatorName: t.operator?.name || "Vsi zaposleni",
      })),
      summary,
    });
  } catch (e) {
    console.error("GET /api/trainings error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju usposabljanj" }, { status: 500 });
  }
}

// POST /api/trainings — dodaj novo usposabljanje
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko dodaja usposabljanja" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      operatorId,
      title,
      category,
      description,
      trainingDate,
      durationHours,
      score,
      maxScore,
      passed,
      certificate,
      validUntil,
      cost,
      trainer,
      note,
      status,
    } = body as {
      operatorId?: string;
      title: string;
      category: string;
      description?: string;
      trainingDate?: string;
      durationHours?: number;
      score?: number;
      maxScore?: number;
      passed?: boolean;
      certificate?: string;
      validUntil?: string;
      cost?: number;
      trainer?: string;
      note?: string;
      status?: string;
    };

    if (!title || !category) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (title, category)" },
        { status: 400 }
      );
    }

    const training = await db.training.create({
      data: {
        restaurantId: tenant.id,
        operatorId: operatorId || null,
        title,
        category,
        description: description || null,
        trainingDate: trainingDate ? new Date(trainingDate) : new Date(),
        durationHours: durationHours || 1,
        status: status || "scheduled",
        completedDate: status === "completed" ? new Date() : null,
        score: score ?? null,
        maxScore: maxScore || 100,
        passed: passed ?? false,
        certificate: certificate || null,
        validUntil: validUntil ? new Date(validUntil) : null,
        cost: cost || 0,
        trainer: trainer || null,
        note: note || null,
      },
    });

    return NextResponse.json(training, { status: 201 });
  } catch (e) {
    console.error("POST /api/trainings error:", e);
    return NextResponse.json({ error: "Napaka pri dodajanju usposabljanja" }, { status: 500 });
  }
}
