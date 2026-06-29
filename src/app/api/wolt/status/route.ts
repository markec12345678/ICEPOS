import { NextRequest, NextResponse } from "next/server";
import { getWoltConfig, isWoltConfigured } from "@/lib/wolt";

export const dynamic = "force-dynamic";

// GET /api/wolt/status — vrne ali je Wolt konfiguriran
export async function GET() {
  try {
    const configured = isWoltConfigured();
    const config = getWoltConfig();

    return NextResponse.json({
      configured,
      env: config?.env || null,
      merchantId: config?.merchantId || null,
      venueId: config?.venueId || null,
      webhookUrl: configured
        ? `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/wolt/webhook`
        : null,
      message: configured
        ? "Wolt je konfiguriran. Webhook URL registriraj v Wolt Partner dashboard."
        : "Wolt ni konfiguriran. Dodaj WOLT_CLIENT_ID, WOLT_CLIENT_SECRET, WOLT_MERCHANT_ID, WOLT_WEBHOOK_SECRET v .env",
    });
  } catch (e) {
    console.error("GET /api/wolt/status error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
