import { NextRequest, NextResponse } from "next/server";
import { capturePaymentIntent, getStripeConfig } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// POST /api/stripe/capture/[id] — capture PaymentIntent (za manual capture)
export async function POST(
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
    const body = await req.json().catch(() => ({}));
    const amount = typeof body.amount === "number" ? body.amount * 100 : undefined;

    if (!amount) {
      return NextResponse.json(
        { error: "Manjka amount (EUR)" },
        { status: 400 }
      );
    }

    const result = await capturePaymentIntent(id, amount, config);
    if (result.success) {
      return NextResponse.json({ ok: true, message: result.message });
    }
    return NextResponse.json({ error: result.message }, { status: 400 });
  } catch (e) {
    console.error("POST /api/stripe/capture/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
