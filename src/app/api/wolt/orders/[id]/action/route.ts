import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getWoltConfig, acceptWoltOrder, rejectWoltOrder, markWoltOrderReady } from "@/lib/wolt";

export const dynamic = "force-dynamic";

// POST /api/wolt/orders/[id]/action — sprejmi/zavrni/označi pripravljeno
// Body: { action: "accept" | "reject" | "ready", reason?: string, prepTime?: number }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const config = getWoltConfig();
    if (!config) {
      return NextResponse.json(
        { error: "Wolt ni konfiguriran. Dodaj WOLT_* env spremenljivke." },
        { status: 503 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const action = body.action as "accept" | "reject" | "ready";
    const reason = body.reason as string | undefined;
    const prepTime = body.prepTime as number | undefined;

    let result;
    switch (action) {
      case "accept":
        result = await acceptWoltOrder(id, config, prepTime);
        break;
      case "reject":
        result = await rejectWoltOrder(id, config, reason || "Zavrnjeno v POS");
        break;
      case "ready":
        result = await markWoltOrderReady(id, config);
        break;
      default:
        return NextResponse.json(
          { error: 'Action mora biti "accept", "reject" ali "ready"' },
          { status: 400 }
        );
    }

    if (result.success) {
      return NextResponse.json({ ok: true, message: result.message });
    }
    return NextResponse.json({ error: result.message }, { status: 400 });
  } catch (e) {
    console.error("POST /api/wolt/orders/[id]/action error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
