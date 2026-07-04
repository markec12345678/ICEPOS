import { createHmac, timingSafeEqual } from "crypto";

// ============================================================
// JWT (HS256) za loyalty tokene — Node built-in crypto, brez odvisnosti
// ============================================================
// Nadomešča prejšnji "token = customer.id" pristop, ki je bil
// ranljiv na account takeover (poznan CUID = full dostop).
// JWT vsebuje customerId + restaurantId + iat + exp, podpisan z
// NEXTAUTH_SECRET. 30-dnevni TTL.

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "dev-secret-change-me";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface LoyaltyTokenPayload {
  customerId: string;
  restaurantId: string;
  iat: number;
  exp: number;
}

function base64UrlEncode(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64").toString("utf8");
}

export function signLoyaltyToken(customerId: string, restaurantId: string): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(JSON.stringify({
    customerId,
    restaurantId,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  }));
  const data = `${header}.${payload}`;
  const signature = createHmac("sha256", JWT_SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export function verifyLoyaltyToken(token: string): LoyaltyTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const data = `${header}.${payload}`;
    const expectedSig = createHmac("sha256", JWT_SECRET).update(data).digest("base64url");

    // Constant-time comparison
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;

    const decoded = JSON.parse(base64UrlDecode(payload)) as LoyaltyTokenPayload;

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) return null;

    return decoded;
  } catch {
    return null;
  }
}
