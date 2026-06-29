// ============================================================
// Wolt Partner API klient — integracija z Wolt dostavo (Slovenija)
// ============================================================
// Wolt je najbolj popularen delivery service v Sloveniji.
// Ta modul implementira:
//   - Sprejemanje Wolt naročil prek webhook
//   - Pridobivanje Wolt access token (OAuth client_credentials)
//   - Posodabljanje statusa naročila (accept, reject, ready)
//   - Sinhronizacija menija (cena, dostopnost)
//
// Reference:
//   - https://developer.wolt.com/
//   - https://developers.wolt.com/docs/developer-tools/api-reference/
//
// Konfiguracija (v .env per restavracija):
//   WOLT_CLIENT_ID=xxx
//   WOLT_CLIENT_SECRET=xxx
//   WOLT_MERCHANT_ID=xxx
//   WOLT_VENUE_ID=xxx (opcijsko)
//   WOLT_WEBHOOK_SECRET=xxx (za webhook signature verification)
// ============================================================

import crypto from "crypto";

const WOLT_API_BASE = "https://daresay-dev.wolt.com/developer-apis"; // test
const WOLT_API_BASE_PROD = "https://daresay.wolt.com/developer-apis"; // produkcija

export interface WoltConfig {
  clientId: string;
  clientSecret: string;
  merchantId: string;
  venueId?: string;
  webhookSecret: string;
  env: "test" | "prod";
}

export interface WoltOrderItem {
  name: string;
  quantity: number;
  unit_price: number; // v centih
  product_id?: string;
  options?: { name: string; quantity: number; unit_price: number }[];
}

export interface WoltOrder {
  id: string;
  status: "NEW" | "RECEIVED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED" | "REJECTED";
  pickup_time?: string;
  delivery_time?: string;
  total_price: number; // v centih
  currency: string;
  items: WoltOrderItem[];
  customer?: {
    name: string;
    phone: string;
  };
  delivery_address?: {
    street: string;
    city: string;
    postal_code: string;
  };
  note?: string;
  created_at: string;
}

// ============================================================
// Glavne funkcije
// ============================================================

// Prebere konfiguracijo iz env
export function getWoltConfig(): WoltConfig | null {
  const clientId = process.env.WOLT_CLIENT_ID;
  const clientSecret = process.env.WOLT_CLIENT_SECRET;
  const merchantId = process.env.WOLT_MERCHANT_ID;
  const webhookSecret = process.env.WOLT_WEBHOOK_SECRET;

  if (!clientId || !clientSecret || !merchantId || !webhookSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    merchantId,
    venueId: process.env.WOLT_VENUE_ID,
    webhookSecret,
    env: (process.env.WOLT_ENV as "test" | "prod") || "test",
  };
}

// Pridobi OAuth access token (client_credentials flow)
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getWoltAccessToken(config: WoltConfig): Promise<string | null> {
  // Preveri cache
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  const baseUrl = config.env === "prod" ? WOLT_API_BASE_PROD : WOLT_API_BASE;

  try {
    const res = await fetch(`${baseUrl}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    });

    if (!res.ok) {
      console.error("[Wolt] Token error:", res.status);
      return null;
    }

    const data = await res.json();
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    };
    return data.access_token;
  } catch (e) {
    console.error("[Wolt] Token fetch error:", e);
    return null;
  }
}

// Sprejmi (accept) Wolt naročilo
export async function acceptWoltOrder(
  orderId: string,
  config: WoltConfig,
  preparationTimeMinutes?: number
): Promise<{ success: boolean; message: string }> {
  const token = await getWoltAccessToken(config);
  if (!token) {
    return { success: false, message: "Ni Wolt access token-a" };
  }

  const baseUrl = config.env === "prod" ? WOLT_API_BASE_PROD : WOLT_API_BASE;

  try {
    const res = await fetch(
      `${baseUrl}/merchants/${config.merchantId}/orders/${orderId}/accept`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          preparationTimeMinutes
            ? { preparation_time_minutes: preparationTimeMinutes }
            : {}
        ),
      }
    );

    if (res.ok) {
      return { success: true, message: "Naročilo sprejeto" };
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

// Zavrni Wolt naročilo
export async function rejectWoltOrder(
  orderId: string,
  config: WoltConfig,
  reason: string
): Promise<{ success: boolean; message: string }> {
  const token = await getWoltAccessToken(config);
  if (!token) {
    return { success: false, message: "Ni Wolt access token-a" };
  }

  const baseUrl = config.env === "prod" ? WOLT_API_BASE_PROD : WOLT_API_BASE;

  try {
    const res = await fetch(
      `${baseUrl}/merchants/${config.merchantId}/orders/${orderId}/reject`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      }
    );

    if (res.ok) {
      return { success: true, message: "Naročilo zavrnjeno" };
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

// Označi naročilo kot pripravljeno (ready for pickup)
export async function markWoltOrderReady(
  orderId: string,
  config: WoltConfig
): Promise<{ success: boolean; message: string }> {
  const token = await getWoltAccessToken(config);
  if (!token) {
    return { success: false, message: "Ni Wolt access token-a" };
  }

  const baseUrl = config.env === "prod" ? WOLT_API_BASE_PROD : WOLT_API_BASE;

  try {
    const res = await fetch(
      `${baseUrl}/merchants/${config.merchantId}/orders/${orderId}/ready`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (res.ok) {
      return { success: true, message: "Označeno kot pripravljeno" };
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

// Posodobi dostopnost izdelka (sinhronizacija menija)
export async function updateWoltItemAvailability(
  productId: string,
  available: boolean,
  config: WoltConfig
): Promise<{ success: boolean; message: string }> {
  const token = await getWoltAccessToken(config);
  if (!token) {
    return { success: false, message: "Ni Wolt access token-a" };
  }

  const baseUrl = config.env === "prod" ? WOLT_API_BASE_PROD : WOLT_API_BASE;
  const venue = config.venueId || config.merchantId;

  try {
    const res = await fetch(
      `${baseUrl}/venues/${venue}/products/${productId}/availability`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ available }),
      }
    );

    if (res.ok) {
      return { success: true, message: `Item ${available ? "omogočen" : "onemogočen"}` };
    }
    return { success: false, message: `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, message: (e as Error).message };
  }
}

// Preveri webhook signature (HMAC-SHA256)
export function verifyWoltWebhookSignature(
  body: string,
  signature: string,
  config: WoltConfig
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

// Ali je Wolt konfiguriran?
export function isWoltConfigured(): boolean {
  return getWoltConfig() !== null;
}
