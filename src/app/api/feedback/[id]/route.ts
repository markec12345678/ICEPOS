import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// PATCH /api/feedback/[id] — odgovori na feedback / označi kot rešeno
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const { id } = await params;
    const body = await req.json();
    const { response, resolved } = body as { response?: string; resolved?: boolean };

    const existing = await db.feedback.findFirst({
      where: { id, restaurantId: tenant.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Feedback ni najden" }, { status: 404 });
    }

    const updated = await db.feedback.update({
      where: { id },
      data: {
        response: response || existing.response,
        resolved: resolved !== undefined ? resolved : existing.resolved,
        respondedAt: resolved || response ? new Date() : existing.respondedAt,
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/feedback/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
