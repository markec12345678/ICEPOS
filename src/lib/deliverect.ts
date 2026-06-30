// ============================================================
// Deliverect API klient — agregator dostavnih platform
// ============================================================
// Deliverect povezuje POS z vsemi dostavnimi platformami:
//   - UberEats
//   - DoorDash
//   - Just Eat / Takeaway.com
//   - Glovo
//   - Wolt (prek Deliverect-a)
//   - Bolt Food
//   - owner direct ordering
//
// Reference:
//   - https://developer.deliverect.com/
//   - https://docs.deliverect.com/
//
// Konfiguracija (v .env):
//   DELIVERECT_CLIENT_ID=xxx
//   DELIVERECT_CLIENT_SECRET=xxx
//   DELIVERECT_LOCATION_ID=xxx
//   DELIVERECT_WEBHOOK_SECRET=xxx (za signature verification)
//   DELIVERECT_ENV=test|production
// ============================================================

import crypto from "crypto";

const DELIVERECT_API_BASE = "https://api.deliverect.com";
const DELIVERECT_API_BASE_EU = "https://api.eu.deliverect.com";

export interface DeliverectConfig {
  clientId: string;
  clientSecret: string;
  locationId: string;
  webhookSecret: string;
  env: "test" | "production";
}

export interface DeliverectOrder {
  _id: string;
  channel: string; // "ubereats", "doordash", "justeat", "glovo", "bolt", "wolt"
  channelOrderId: string;
  status: number; // 0=new, 10=accepted, 20=rejected, 30=ready, 40=picked_up, 100=completed
  orderType: number; // 1=delivery, 2=pickup, 3=in-restaurant
  pickupTime: string;
  deliveryTime?: string;
  customer?: {
    name: string;
    phone: string;
    email?: string;
  };
  deliveryAddress?: {
    street: string;
    city: string;
    postalCode: string;
    notes?: string;
  };
  orderIsAlreadyPaid: boolean;
  payment: {
    amount: number; // v centih
    currency: string;
    method: string;
  };
  items: {
    plu: string; // product ID
    name: string;
    quantity: number;
    price: number; // v centih
    notes?: string;
    subItems?: { name: string; quantity: number; price: number }[];
  }[];
  note?: string;
}

// ============================================================
// Glavne funkcije
// ============================================================

export function getDeliverectConfig(): DeliverectConfig | null {
  const clientId = process.env.DELIVERECT_CLIENT_ID;
  const clientSecret = process.env.DELIVERECT_CLIENT_SECRET;
  const locationId = process.env.DELIVERECT_LOCATION_ID;
  const webhookSecret = process.env.DELIVERECT_WEBHOOK_SECRET;

  if (!clientId || !clientSecret || !locationId || !webhookSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    locationId,
    webhookSecret,
    env: (process.env.DELIVERECT_ENV as "test" | "production") || "test",
  };
}

export function isDeliverectConfigured(): boolean {
  return getDeliverectConfig() !== null;
}

// OAuth token caching
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getDeliverectToken(config: DeliverectConfig): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  const baseUrl = config.env === "production" ? DELIVERECT_API_BASE_EU : DELIVERECT_API_BASE;

  try {
    const res = await fetch(`${baseUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    });

    if (!res.ok) {
      console.error("[Deliverect] Token error:", res.status);
      return null;
    }

    const data = await res.json();
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    };
    return data.access_token;
  } catch (e) {
    console.error("[Deliverect] Token fetch error:", e);
    return null;
  }
}

// Sprejmi/zavrni Deliverect naročilo
export async function updateOrderStatus(
  orderId: string,
  status: "accept" | "reject" | "ready" | "pickup",
  config: DeliverectConfig
): Promise<{ success: boolean; message: string }> {
  const token = await getDeliverectToken(config);
  if (!token) {
    return { success: false, message: "Ni Deliverect access token-a" };
  }

  const baseUrl = config.env === "production" ? DELIVERECT_API_BASE_EU : DELIVERECT_API_BASE;
  const statusMap: Record<string, number> = {
    accept: 10,
    reject: 20,
    ready: 30,
    pickup: 40,
  };

  try {
    const res = await fetch(`${baseUrl}/order/statusUpdate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId,
        status: statusMap[status],
      }),
    });

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

// Sinhroniziraj meni z Deliverect
export async function syncMenu(
  menuData: unknown,
  config: DeliverectConfig
): Promise<{ success: boolean; message: string }> {
  const token = await getDeliverectToken(config);
  if (!token) {
    return { success: false, message: "Ni Deliverect access token-a" };
  }

  const baseUrl = config.env === "production" ? DELIVERECT_API_BASE_EU : DELIVERECT_API_BASE;

  try {
    const res = await fetch(`${baseUrl}/menu`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(menuData),
    });

    if (res.ok) {
      return { success: true, message: "Meni sinhroniziran" };
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

// Preveri webhook signature (HMAC-SHA256)
export function verifyDeliverectWebhookSignature(
  body: string,
  signature: string,
  config: DeliverectConfig
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

// Channel labels
export const CHANNEL_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  ubereats: { label: "Uber Eats", icon: "🚗", color: "bg-black text-white" },
  doordash: { label: "DoorDash", icon: "🛵", color: "bg-red-600 text-white" },
  justeat: { label: "Just Eat", icon: "🥡", color: "bg-orange-500 text-white" },
  takeaway: { label: "Takeaway", icon: "🥡", color: "bg-orange-500 text-white" },
  glovo: { label: "Glovo", icon: "🟡", color: "bg-yellow-400 text-black" },
  bolt: { label: "Bolt Food", icon: "🟢", color: "bg-green-500 text-white" },
  wolt: { label: "Wolt", icon: "🟠", color: "bg-orange-400 text-white" },
  direct: { label: "Direktno", icon: "🏪", color: "bg-blue-500 text-white" },
};

export function getChannelInfo(channel: string) {
  return (
    CHANNEL_LABELS[channel] || {
      label: channel,
      icon: "📦",
      color: "bg-gray-500 text-white",
    }
  );
}
