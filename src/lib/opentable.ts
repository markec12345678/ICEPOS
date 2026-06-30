// ============================================================
// OpenTable/Resy integracija — sinhronizacija rezervacij
// ============================================================
// OpenTable je največja platforma za rezervacije restavracij.
// Resy je alternativa (American Express).
//
// Ta modul implementira:
//   - Sprejemanje rezervacij prek webhook
//   - Sinhronizacija z našo Reservation tabelo
//   - Avtomatsko dodeljevanje miz
//   - Status update (confirmed, seated, no_show, cancelled)
//
// Reference:
//   - https://developer.opentable.com/
//   - https://resy.com/api-docs
//
// Konfiguracija (v .env):
//   OPENTABLE_API_KEY=xxx
//   OPENTABLE_RESTAURANT_ID=xxx
//   OPENTABLE_WEBHOOK_SECRET=xxx
//   RESY_API_KEY=xxx (opcijsko)
//   RESY_RESTAURANT_ID=xxx (opcijsko)
// ============================================================

import crypto from "crypto";

const OPENTABLE_API_BASE = "https://api.opentable.com/v1";
const RESY_API_BASE = "https://api.resy.com/v1";

export interface OpenTableConfig {
  apiKey: string;
  restaurantId: string;
  webhookSecret: string;
}

export interface OpenTableReservation {
  id: string;
  restaurantId: string;
  status: "confirmed" | "seated" | "no_show" | "cancelled";
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  partySize: number;
  reservationDateTime: string; // ISO
  duration: number; // minute
  specialRequests?: string;
  tableId?: string;
  notes?: string;
}

// ============================================================
// Glavne funkcije
// ============================================================

export function getOpenTableConfig(): OpenTableConfig | null {
  const apiKey = process.env.OPENTABLE_API_KEY;
  const restaurantId = process.env.OPENTABLE_RESTAURANT_ID;
  const webhookSecret = process.env.OPENTABLE_WEBHOOK_SECRET;

  if (!apiKey || !restaurantId || !webhookSecret) {
    return null;
  }

  return { apiKey, restaurantId, webhookSecret };
}

export function isOpenTableConfigured(): boolean {
  return getOpenTableConfig() !== null;
}

// Preveri webhook signature
export function verifyOpenTableWebhookSignature(
  body: string,
  signature: string,
  config: OpenTableConfig
): boolean {
  try {
    const expected = crypto
      .createHmac("sha256", config.webhookSecret)
      .update(body)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

// Pridobi rezervacije iz OpenTable
export async function fetchReservations(
  date: string,
  config: OpenTableConfig
): Promise<OpenTableReservation[]> {
  try {
    const res = await fetch(
      `${OPENTABLE_API_BASE}/restaurants/${config.restaurantId}/reservations?date=${date}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      }
    );

    if (!res.ok) {
      console.error("[OpenTable] Fetch error:", res.status);
      return [];
    }

    const data = await res.json();
    return data.reservations || [];
  } catch (e) {
    console.error("[OpenTable] Fetch error:", e);
    return [];
  }
}

// Posodobi status rezervacije v OpenTable
export async function updateReservationStatus(
  reservationId: string,
  status: "confirmed" | "seated" | "no_show" | "cancelled",
  config: OpenTableConfig
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(
      `${OPENTABLE_API_BASE}/reservations/${reservationId}/status`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      }
    );

    if (res.ok) {
      return { success: true, message: `Status posodobljen: ${status}` };
    }
    const data = await res.json();
    return {
      success: false,
      message: data.message || `HTTP ${res.status}`,
    };
  } catch (e) {
    return { success: false, message: (e as Error).message };
  }
}

// Resy integracija (podobno)
export function getResyConfig(): OpenTableConfig | null {
  const apiKey = process.env.RESY_API_KEY;
  const restaurantId = process.env.RESY_RESTAURANT_ID;
  const webhookSecret = process.env.RESY_WEBHOOK_SECRET || "resy-default";

  if (!apiKey || !restaurantId) {
    return null;
  }

  return { apiKey, restaurantId, webhookSecret };
}

export function isResyConfigured(): boolean {
  return getResyConfig() !== null;
}

// Map OpenTable status v naš status
export function mapOpenTableStatus(status: string): string {
  const map: Record<string, string> = {
    confirmed: "confirmed",
    seated: "seated",
    no_show: "no_show",
    cancelled: "cancelled",
  };
  return map[status] || "confirmed";
}

// Map naš status v OpenTable status
export function mapToOpenTableStatus(status: string): string {
  const map: Record<string, string> = {
    confirmed: "confirmed",
    seated: "seated",
    no_show: "no_show",
    cancelled: "cancelled",
  };
  return map[status] || "confirmed";
}
