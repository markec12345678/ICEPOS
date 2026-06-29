import { NextRequest, NextResponse } from "next/server";
import { checkPaymentStatus, getSumupConfig } from "@/lib/sumup";

export const dynamic = "force-dynamic";

// GET /api/sumup/status/[id] — preveri status plačila (polling)
export async function GET(
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
    const result = await checkPaymentStatus(id, config);
    return NextResponse.json(result);
  } catch (e) {
    console.error("GET /api/sumup/status/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
