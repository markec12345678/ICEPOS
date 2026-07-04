// ============================================================
// Stripe Terminal API klient — Apple Pay / Google Pay / kartice
// ============================================================
// Stripe Terminal omogoča:
//   - Apple Pay (NFC na iPhone)
//   - Google Pay (NFC na Android)
//   - Kontaktne in brezkontaktne kartice
//   - Tap to Pay na iPhone (iOS 16.4+)
//
// Reference:
//   - https://stripe.com/docs/terminal
//   - https://stripe.com/docs/terminal/quickstart
//
// Konfiguracija (v .env):
//   STRIPE_SECRET_KEY=sk_test_xxx
//   STRIPE_TERMINAL_LOCATION_ID=xxx (opcijsko)
// ============================================================

const STRIPE_API_BASE = "https://api.stripe.com/v1";

export interface StripeConfig {
  secretKey: string;
  locationId?: string;
}

export interface PaymentIntentRequest {
  amount: number; // v centih (EUR × 100)
  currency: string; // "eur"
  description?: string;
  orderId?: string; // internal reference
  tenantId?: string; // tenant ID za webhook routing
  // Apple Pay / Google Pay zahtevajo capture_method: "automatic"
  captureMethod: "automatic" | "manual";
  // Payment methods
  paymentMethodTypes: string[]; // ["card", "apple_pay", "google_pay"]
}

export interface PaymentIntentResponse {
  id: string; // pi_xxx
  client_secret: string; // za frontend Stripe.js
  amount: number;
  currency: string;
  status: string;
  next_action?: {
    type: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================
// Glavne funkcije
// ============================================================

export function getStripeConfig(): StripeConfig | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return {
    secretKey,
    locationId: process.env.STRIPE_TERMINAL_LOCATION_ID,
  };
}

export function isStripeConfigured(): boolean {
  return getStripeConfig() !== null;
}

// Ustvari PaymentIntent (za Apple Pay / Google Pay / kartica)
export async function createPaymentIntent(
  req: PaymentIntentRequest,
  config: StripeConfig
): Promise<PaymentIntentResponse> {
  const url = `${STRIPE_API_BASE}/payment_intents`;

  const params = new URLSearchParams();
  params.append("amount", String(Math.round(req.amount)));
  params.append("currency", req.currency.toLowerCase());
  params.append("capture_method", req.captureMethod);
  for (const pm of req.paymentMethodTypes) {
    params.append("payment_method_types[]", pm);
  }
  if (req.description) {
    params.append("description", req.description.slice(0, 500));
  }
  if (req.orderId) {
    params.append("metadata[orderId]", req.orderId);
  }
  if (req.tenantId) {
    params.append("metadata[tenantId]", req.tenantId);
  }
  params.append("metadata[source]", "gostilna-pos");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        id: "",
        client_secret: "",
        amount: req.amount,
        currency: req.currency,
        status: "failed",
        error: {
          code: data.error?.code || `HTTP_${res.status}`,
          message: data.error?.message || `Stripe napaka: ${res.status}`,
        },
      };
    }

    return {
      id: data.id,
      client_secret: data.client_secret,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      next_action: data.next_action,
    };
  } catch (e) {
    return {
      id: "",
      client_secret: "",
      amount: req.amount,
      currency: req.currency,
      status: "failed",
      error: {
        code: "NETWORK_ERROR",
        message: (e as Error).message,
      },
    };
  }
}

// Preveri status PaymentIntent
export async function getPaymentIntentStatus(
  paymentIntentId: string,
  config: StripeConfig
): Promise<PaymentIntentResponse> {
  const url = `${STRIPE_API_BASE}/payment_intents/${paymentIntentId}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        id: paymentIntentId,
        client_secret: "",
        amount: 0,
        currency: "eur",
        status: "failed",
        error: {
          code: data.error?.code || `HTTP_${res.status}`,
          message: data.error?.message || `Stripe napaka`,
        },
      };
    }

    return {
      id: data.id,
      client_secret: data.client_secret,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      next_action: data.next_action,
    };
  } catch (e) {
    return {
      id: paymentIntentId,
      client_secret: "",
      amount: 0,
      currency: "eur",
      status: "failed",
      error: {
        code: "NETWORK_ERROR",
        message: (e as Error).message,
      },
    };
  }
}

// Capture PaymentIntent (za manual capture)
export async function capturePaymentIntent(
  paymentIntentId: string,
  amount: number, // v centih
  config: StripeConfig
): Promise<{ success: boolean; message: string }> {
  const url = `${STRIPE_API_BASE}/payment_intents/${paymentIntentId}/capture`;

  const params = new URLSearchParams();
  params.append("amount_to_capture", String(Math.round(amount)));

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (res.ok) {
      return { success: true, message: "Plačilo uspešno capture-dano" };
    }
    const data = await res.json();
    return {
      success: false,
      message: data.error?.message || `HTTP ${res.status}`,
    };
  } catch (e) {
    return { success: false, message: (e as Error).message };
  }
}

// Prekliči PaymentIntent
export async function cancelPaymentIntent(
  paymentIntentId: string,
  config: StripeConfig
): Promise<{ success: boolean; message: string }> {
  const url = `${STRIPE_API_BASE}/payment_intents/${paymentIntentId}/cancel`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
      },
    });

    if (res.ok) {
      return { success: true, message: "Plačilo preklicano" };
    }
    return { success: false, message: `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, message: (e as Error).message };
  }
}

// Vrni publishable key za frontend (Stripe.js)
export function getStripePublishableKey(): string | null {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null;
}
