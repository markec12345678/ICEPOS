import { NextRequest, NextResponse } from "next/server";
import { getPaymentIntentStatus, getStripeConfig } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// GET /api/stripe/status/[id] — preveri status PaymentIntent
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const config = getStripeConfig();
    if (!config) {
      return NextResponse.json(
        { error: "Stripe ni konfiguriran" },
        { status: 503 }
      );
    }

    const { id } = await params;
    const result = await getPaymentIntentStatus(id, config);
    return NextResponse.json(result);
  } catch (e) {
    console.error("GET /api/stripe/status/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
