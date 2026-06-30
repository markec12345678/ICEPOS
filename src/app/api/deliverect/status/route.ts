import { NextRequest, NextResponse } from "next/server";
import { getDeliverectConfig, isDeliverectConfigured } from "@/lib/deliverect";

export const dynamic = "force-dynamic";

// GET /api/deliverect/status — vrne ali je Deliverect konfiguriran
export async function GET() {
  try {
    const configured = isDeliverectConfigured();
    const config = getDeliverectConfig();

    return NextResponse.json({
      configured,
      env: config?.env || null,
      locationId: config?.locationId || null,
      webhookUrl: configured
        ? `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/deliverect/webhook`
        : null,
      supportedChannels: [
        { id: "ubereats", label: "Uber Eats", icon: "🚗" },
        { id: "doordash", label: "DoorDash", icon: "🛵" },
        { id: "justeat", label: "Just Eat", icon: "🥡" },
        { id: "takeaway", label: "Takeaway", icon: "🥡" },
        { id: "glovo", label: "Glovo", icon: "🟡" },
        { id: "bolt", label: "Bolt Food", icon: "🟢" },
        { id: "wolt", label: "Wolt", icon: "🟠" },
        { id: "direct", label: "Direktno", icon: "🏪" },
      ],
      message: configured
        ? "Deliverect je konfiguriran. Webhook URL registriraj v Deliverect dashboard."
        : "Deliverect ni konfiguriran. Dodaj DELIVERECT_CLIENT_ID, DELIVERECT_CLIENT_SECRET, DELIVERECT_LOCATION_ID, DELIVERECT_WEBHOOK_SECRET v .env",
    });
  } catch (e) {
    console.error("GET /api/deliverect/status error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
