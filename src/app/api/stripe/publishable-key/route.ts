import { NextResponse } from "next/server";
import { getStripePublishableKey, isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// GET /api/stripe/publishable-key — vrne publishable key za frontend Stripe.js
export async function GET() {
  return NextResponse.json({
    configured: isStripeConfigured(),
    publishableKey: getStripePublishableKey(),
  });
}
