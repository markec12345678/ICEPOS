import { NextRequest } from "next/server";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export interface AuthOperator {
  id: string;
  name: string;
  taxNumber: string;
  role: string;
  restaurantId: string;
  restaurantName: string;
}

// ============================================================
// PIN HASHING — scrypt (Node built-in, brez dodatnih odvisnosti)
// ============================================================
// Format: "scrypt:<salt-hex>:<hash-hex>"
// Backward-compat: 4-mesten plaintext PIN (legacy seed) → direktna primerjava
// z timingSafeEqual (konstantno-časovna).

/**
 * Hash-a PIN s scrypt + naključno soljo. Vrne format "scrypt:<salt>:<hash>".
 */
export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

/**
 * Preveri PIN proti shranjeni vrednosti (hash ali legacy plaintext).
 * Konstantno-časovna primerjava (timingSafeEqual) — varna proti timing napadom.
 */
export function verifyPin(pin: string, stored: string): boolean {
  if (!pin || typeof pin !== "string" || !stored) return false;

  // Legacy: 4-mesten plaintext PIN (iz starega seed-a)
  if (stored.length === 4 && !stored.includes(":")) {
    if (pin.length !== stored.length) return false;
    try {
      return timingSafeEqual(Buffer.from(pin), Buffer.from(stored));
    } catch {
      return false;
    }
  }

  // Nov format: scrypt:<salt>:<hash>
  if (stored.startsWith("scrypt:")) {
    const parts = stored.split(":");
    if (parts.length !== 3) return false;
    const [, salt, hash] = parts;
    try {
      const hashBuf = scryptSync(pin, salt, 64);
      return timingSafeEqual(hashBuf, Buffer.from(hash, "hex"));
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Ali je PIN v legacy plaintext formatu (4-mesten, brez "scrypt:" prefix-a)?
 * Uporablja se za auto-upgrade pri prvi prijavi.
 */
export function isLegacyPlaintextPin(stored: string): boolean {
  return stored.length === 4 && !stored.includes(":");
}

/**
 * Prebere PIN iz header-ja in vrne operaterja (ali null).
 * Uporablja verifyPin() za konstantno-časovno primerjavo.
 * Ker je PIN hashed, ga ne moremo query-ati direktno — naložimo vse
 * aktivne operaterje za tenant in preverimo vsakega.
 */
export async function getOperatorFromRequest(
  req: NextRequest
): Promise<AuthOperator | null> {
  const pin = req.headers.get("x-operator-pin");
  if (!pin) return null;

  const tenant = await getTenantFromRequest(req);
  if (!tenant) return null;

  const operators = await db.operator.findMany({
    where: { restaurantId: tenant.id, active: true },
  });

  for (const op of operators) {
    if (verifyPin(pin, op.pin)) {
      return {
        id: op.id,
        name: op.name,
        taxNumber: tenant.taxNumber,
        role: op.role,
        restaurantId: tenant.id,
        restaurantName: tenant.name,
      };
    }
  }

  return null;
}
