import { NextRequest, NextResponse } from "next/server";
import { cancelPayment, getSumupConfig } from "@/lib/sumup";

export const dynamic = "force-dynamic";

// POST /api/sumup/cancel/[id] — prekliči plačilo
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const config = getSumupConfig();
    if (!config) {
      return NextResponse.json(
        { error: "Sumup ni konfiguriran" },
        { status: 503 }
      );
    }

    const { id } = await params;
    const result = await cancelPayment(id, config);

    if (result.success) {
      return NextResponse.json({ ok: true, message: result.message });
    }
    return NextResponse.json({ error: result.message }, { status: 400 });
  } catch (e) {
    console.error("POST /api/sumup/cancel/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
