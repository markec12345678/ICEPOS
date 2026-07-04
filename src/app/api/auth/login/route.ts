import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { verifyPin, hashPin, isLegacyPlaintextPin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// === Rate limiting (in-memory; za produkcijo zamenjaj z Redis) ===
const loginAttempts = new Map<string, { count: number; firstAttemptAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minut
const RATE_LIMIT_MAX = 5; // 5 neuspešnih poskusov

// POST /api/auth/login — preveri PIN in vrne operaterja + restavracijo
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin, restaurantSlug } = body as { pin: string; restaurantSlug?: string };

    if (!pin || pin.length < 4 || pin.length > 8) {
      return NextResponse.json(
        { error: "PIN mora biti 4-8 mesten" },
        { status: 400 }
      );
    }

    // === Rate limiting per IP ===
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const rateLimitKey = `login:${ip}`;
    const attempts = loginAttempts.get(rateLimitKey);

    if (attempts) {
      const elapsed = Date.now() - attempts.firstAttemptAt;
      if (elapsed > RATE_LIMIT_WINDOW_MS) {
        // Reset po poteku okna
        loginAttempts.delete(rateLimitKey);
      } else if (attempts.count >= RATE_LIMIT_MAX) {
        const retryAfterSec = Math.ceil((RATE_LIMIT_WINDOW_MS - elapsed) / 1000);
        return NextResponse.json(
          { error: "Preveč neuspešnih poskusov. Poskusi znova čez " + Math.ceil(retryAfterSec / 60) + " min." },
          { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
        );
      }
    }

    // Določi tenant
    let tenant;
    if (restaurantSlug) {
      tenant = await db.restaurant.findUnique({
        where: { slug: restaurantSlug },
      });
    } else {
      tenant = await getTenantFromRequest(req);
    }

    if (!tenant || !tenant.active) {
      // Zabeleži neuspešen poskus
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        { error: "Restavracija ni najdena. Izberi restavracijo." },
        { status: 404 }
      );
    }

    // === PIN verification z verifyPin (podpira hashed + legacy) ===
    const operators = await db.operator.findMany({
      where: { restaurantId: tenant.id, active: true },
    });

    let operator = null;
    for (const op of operators) {
      if (verifyPin(pin, op.pin)) {
        operator = op;
        break;
      }
    }

    if (!operator) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        { error: "Napačen PIN za to restavracijo" },
        { status: 401 }
      );
    }

    // === Auto-upgrade legacy plaintext PIN → scrypt hash ===
    if (isLegacyPlaintextPin(operator.pin)) {
      try {
        await db.operator.update({
          where: { id: operator.id },
          data: { pin: hashPin(pin) },
        });
        console.log(`[auth] Auto-upgraded PIN for operator ${operator.id}`);
      } catch (e) {
        console.error("[auth] Auto-upgrade failed:", e);
      }
    }

    // === Uspešna prijava — resetiraj rate limit ===
    loginAttempts.delete(rateLimitKey);

    return NextResponse.json({
      id: operator.id,
      name: operator.name,
      taxNumber: tenant.taxNumber,
      role: operator.role,
      restaurantId: tenant.id,
      restaurantName: tenant.name,
      restaurantSlug: tenant.slug,
      businessUnit: tenant.businessUnit,
      cashRegister: tenant.cashRegister,
      loginAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("POST /api/auth/login error:", e);
    return NextResponse.json({ error: "Napaka pri prijavi" }, { status: 500 });
  }
}

function recordFailedAttempt(key: string) {
  const existing = loginAttempts.get(key);
  if (existing) {
    existing.count++;
  } else {
    loginAttempts.set(key, { count: 1, firstAttemptAt: Date.now() });
  }
}
