import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import {
  getOpenTableConfig,
  isOpenTableConfigured,
  fetchReservations,
} from "@/lib/opentable";

export const dynamic = "force-dynamic";

// GET /api/opentable/status — ali je OpenTable konfiguriran
export async function GET() {
  return NextResponse.json({
    configured: isOpenTableConfigured(),
    webhookUrl: isOpenTableConfigured()
      ? `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/opentable/webhook`
      : null,
    message: isOpenTableConfigured()
      ? "OpenTable je konfiguriran."
      : "OpenTable ni konfiguriran. Dodaj OPENTABLE_API_KEY, OPENTABLE_RESTAURANT_ID, OPENTABLE_WEBHOOK_SECRET v .env",
  });
}
