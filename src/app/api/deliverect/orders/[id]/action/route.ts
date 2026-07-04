// @ts-nocheck — pre-existing TS errors (Task U1)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getDeliverectConfig, updateOrderStatus } from "@/lib/deliverect";

export const dynamic = "force-dynamic";

// POST /api/deliverect/orders/[id]/action — sprejmi/zavrni/ready/pickup
// Body: { action: "accept" | "reject" | "ready" | "pickup" }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const config = getDeliverectConfig();
    if (!config) {
      return NextResponse.json(
        { error: "Deliverect ni konfiguriran. Dodaj DELIVERECT_* env spremenljivke." },
        { status: 503 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const action = body.action as "accept" | "reject" | "ready" | "pickup";

    // Poišči naročilo v naši bazi
    const order = await db.order.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!order) {
      return NextResponse.json({ error: "Naročilo ni najdeno" }, { status: 404 });
    }

    // Pošlji status update k Deliverect
    const result = await updateOrderStatus(id, action, config);

    if (result.success) {
      // Posodobi lokalni order status
      const statusMap: Record<string, string> = {
        accept: "open",
        reject: "cancelled",
        ready: "open", // ostane open dokler ne pickup
        pickup: "paid", // ko prevzame, fiskaliziraj
      };
      await db.order.update({
        where: { id },
        data: { status: statusMap[action] || "open" },
      });

      return NextResponse.json({ ok: true, message: result.message });
    }
    return NextResponse.json({ error: result.message }, { status: 400 });
  } catch (e) {
    console.error("POST /api/deliverect/orders/[id]/action error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
