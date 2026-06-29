// ============================================================
// Sumup Terminal API klient
// ============================================================
// Sumup je najbolj popularen plačilni terminal v Sloveniji.
// Ta modul implementira integracijo z Sumup REST API.
//
// Reference:
// - https://developer.sumup.com/api
// - Terminal API: POST /v0.1/payment-requests (checkout na terminalu)
//
// Uporaba:
//   import { createTerminalPayment, checkPaymentStatus } from "@/lib/sumup";
//   const payment = await createTerminalPayment({ amount: 12.50, currency: "EUR" });
//   const status = await checkPaymentStatus(payment.id);
//
// Konfiguracija (v .env):
//   SUMUP_API_KEY=xxx (https://me.sumup.com/en/developers)
//   SUMUP_MERCHANT_CODE=xxx
//   SUMUP_TERMINAL_ID=xxx (optional, za specifičen terminal)
// ============================================================

const SUMUP_API_BASE = "https://api.sumup.com";
const SUMUP_API_BASE_EU = "https://api.eu.sumup.com";

export interface SumupConfig {
  apiKey: string;
  merchantCode: string;
  terminalId?: string;
  currency: string; // "EUR"
}

export interface TerminalPaymentRequest {
  amount: number;
  currency: string;
  merchantCode: string;
  terminalId?: string;
  description?: string;
  // Internal reference (POS order ID)
  merchantRef?: string;
  // Return URL za spletno checkout (za terminal ni potreben)
  returnUrl?: string;
}

export interface TerminalPaymentResponse {
  id: string;
  status: "PENDING" | "SUCCESSFUL" | "FAILED" | "CANCELLED";
  amount: number;
  currency: string;
  transactionCode?: string;
  cardLast4Digits?: string;
  cardType?: string;
  errorMessage?: string;
  // RAW response za debug
  raw?: unknown;
}

// ============================================================
// Glavne funkcije
// ============================================================

// Prebere konfiguracijo iz env (server-side only)
export function getSumupConfig(): SumupConfig | null {
  const apiKey = process.env.SUMUP_API_KEY;
  const merchantCode = process.env.SUMUP_MERCHANT_CODE;
  if (!apiKey || !merchantCode) {
    return null;
  }
  return {
    apiKey,
    merchantCode,
    terminalId: process.env.SUMUP_TERMINAL_ID,
    currency: "EUR",
  };
}

// Ustvari plačilni zahtevek na terminalu
export async function createTerminalPayment(
  req: TerminalPaymentRequest,
  config: SumupConfig
): Promise<TerminalPaymentResponse> {
  const url = `${SUMUP_API_BASE}/v0.1/merchants/${config.merchantCode}/payment-requests`;

  const body = {
    total_amount: {
      amount: req.amount.toFixed(2),
      currency: req.currency,
    },
    merchant_code: config.merchantCode,
    terminal_id: req.terminalId || config.terminalId,
    description: req.description || "POS plačilo",
    merchant_reference: req.merchantRef,
    return_url: req.returnUrl,
    type: "terminal",
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "Gostilna-POS/1.0",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        id: "",
        status: "FAILED",
        amount: req.amount,
        currency: req.currency,
        errorMessage: data.error_message || data.message || `HTTP ${response.status}`,
        raw: data,
      };
    }

    return {
      id: data.id || data.transaction_code,
      status: mapStatus(data.status || data.transaction_status),
      amount: req.amount,
      currency: req.currency,
      transactionCode: data.transaction_code,
      cardLast4Digits: data.card?.last4_digits,
      cardType: data.card?.type,
      raw: data,
    };
  } catch (e) {
    return {
      id: "",
      status: "FAILED",
      amount: req.amount,
      currency: req.currency,
      errorMessage: (e as Error).message,
    };
  }
}

// Preveri status plačila (polling)
export async function checkPaymentStatus(
  paymentId: string,
  config: SumupConfig
): Promise<TerminalPaymentResponse> {
  const url = `${SUMUP_API_BASE}/v0.1/merchants/${config.merchantCode}/payment-requests/${paymentId}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "User-Agent": "Gostilna-POS/1.0",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        id: paymentId,
        status: "FAILED",
        amount: 0,
        currency: config.currency,
        errorMessage: data.error_message || `HTTP ${response.status}`,
        raw: data,
      };
    }

    return {
      id: paymentId,
      status: mapStatus(data.status || data.transaction_status),
      amount: parseFloat(data.total_amount?.amount || "0"),
      currency: data.total_amount?.currency || config.currency,
      transactionCode: data.transaction_code,
      cardLast4Digits: data.card?.last4_digits,
      cardType: data.card?.type,
      raw: data,
    };
  } catch (e) {
    return {
      id: paymentId,
      status: "FAILED",
      amount: 0,
      currency: config.currency,
      errorMessage: (e as Error).message,
    };
  }
}

// Prekliči plačilo (če je še PENDING)
export async function cancelPayment(
  paymentId: string,
  config: SumupConfig
): Promise<{ success: boolean; message: string }> {
  const url = `${SUMUP_API_BASE}/v0.1/merchants/${config.merchantCode}/payment-requests/${paymentId}/cancel`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "User-Agent": "Gostilna-POS/1.0",
      },
    });

    if (response.ok) {
      return { success: true, message: "Plačilo preklicano" };
    }
    const data = await response.json();
    return {
      success: false,
      message: data.error_message || `HTTP ${response.status}`,
    };
  } catch (e) {
    return { success: false, message: (e as Error).message };
  }
}

// ============================================================
// Pomožne funkcije
// ============================================================

function mapStatus(s: string): TerminalPaymentResponse["status"] {
  const upper = s.toUpperCase();
  if (upper.includes("SUCCESS")) return "SUCCESSFUL";
  if (upper.includes("FAIL")) return "FAILED";
  if (upper.includes("CANCEL")) return "CANCELLED";
  return "PENDING";
}

// Ali je Sumup konfiguriran?
export function isSumupConfigured(): boolean {
  return getSumupConfig() !== null;
}
