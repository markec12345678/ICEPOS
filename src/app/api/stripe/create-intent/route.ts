import { NextRequest, NextResponse } from "next/server";
import { createPaymentIntent, getStripeConfig } from "@/lib/stripe";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// POST /api/stripe/create-intent — ustvari PaymentIntent za Apple Pay/Google Pay/kartica
// Body: { amount: number (EUR), orderId?: string, methods: ["card", "apple_pay", "google_pay"] }
export async function POST(req: NextRequest) {
  try {
    const config = getStripeConfig();
    if (!config) {
      return NextResponse.json(
        {
          error: "Stripe ni konfiguriran. Nastavi STRIPE_SECRET_KEY v .env",
          mode: "poc",
        },
        { status: 503 }
      );
    }

    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json(
        { error: "Restavracija ni najdena" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { amount, orderId, methods } = body as {
      amount: number;
      orderId?: string;
      methods?: string[];
    };

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Znesek mora biti pozitiven" },
        { status: 400 }
      );
    }

    const result = await createPaymentIntent(
      {
        amount: Math.round(amount * 100), // EUR → centi
        currency: "eur",
        description: orderId ? `POS naročilo #${orderId.slice(-6)}` : "POS plačilo",
        orderId,
        tenantId: tenant.id,
        captureMethod: "automatic",
        paymentMethodTypes: methods || ["card", "apple_pay", "google_pay"],
      },
      config
    );

    return NextResponse.json(result, { status: result.error ? 400 : 200 });
  } catch (e) {
    console.error("POST /api/stripe/create-intent error:", e);
    return NextResponse.json({ error: "Napaka pri Stripe klicu" }, { status: 500 });
  }
}
