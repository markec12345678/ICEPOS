import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/haccp/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const { id } = await params;
    const inspection = await db.haccpInspection.findFirst({
      where: { id, restaurantId: tenant.id },
    });

    if (!inspection) {
      return NextResponse.json({ error: "Pregled ni najden" }, { status: 404 });
    }

    return NextResponse.json(inspection);
  } catch (e) {
    console.error("GET /api/haccp/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// PATCH /api/haccp/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko ureja preglede" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await db.haccpInspection.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Pregled ni najden" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowed = [
      "type", "inspector", "cleanlinessScore", "foodHandlingScore",
      "storageScore", "temperatureScore", "documentationScore", "pestControlScore",
      "status", "findings", "recommendations", "correctiveActions", "note",
    ];
    for (const key of allowed) {
      if (key in body) updateData[key] = body[key];
    }
    if (body.inspectionDate) updateData.inspectionDate = new Date(body.inspectionDate);
    if (body.nextInspectionDate) updateData.nextInspectionDate = new Date(body.nextInspectionDate);

    // Ponovno izračunaj overallScore
    const scores = [
      body.cleanlinessScore ?? existing.cleanlinessScore,
      body.foodHandlingScore ?? existing.foodHandlingScore,
      body.storageScore ?? existing.storageScore,
      body.temperatureScore ?? existing.temperatureScore,
      body.documentationScore ?? existing.documentationScore,
      body.pestControlScore ?? existing.pestControlScore,
    ];
    updateData.overallScore = Math.round((scores.reduce((s, v) => s + v, 0) / 6) * 100) / 100;

    const updated = await db.haccpInspection.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/haccp/[id] error:", e);
    return NextResponse.json({ error: "Napaka pri posodabljanju" }, { status: 500 });
  }
}

// DELETE /api/haccp/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko briše preglede" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await db.haccpInspection.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Pregled ni najden" }, { status: 404 });
    }

    await db.haccpInspection.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/haccp/[id] error:", e);
    return NextResponse.json({ error: "Napaka pri brisanju" }, { status: 500 });
  }
}
