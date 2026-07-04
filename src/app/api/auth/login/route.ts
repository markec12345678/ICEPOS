import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { verifyPin, hashPin, isLegacyPlaintextPin } from "@/lib/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

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

    // === Rate limiting per IP (Redis-backed z in-memory fallback) ===
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const rateLimitKey = `login:${ip}`;
    const rateLimit = await checkRateLimit(rateLimitKey, {
      windowMs: 15 * 60 * 1000,  // 15 min
      maxAttempts: 5,
    });

    if (!rateLimit.allowed) {
      const retryAfterSec = Math.ceil(rateLimit.retryAfterMs / 1000);
      return NextResponse.json(
        { error: "Preveč neuspešnih poskusov. Poskusi znova čez " + Math.ceil(retryAfterSec / 60) + " min." },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
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
        return NextResponse.json(
        { error: "Restavracija ni najdena. Izberi restavracijo." },
        { status: 404 }
      );
    }

    // === PIN verification z verifyPin (podpira hashed + legacy) ===
    const operators = await db.operator.findMany({
      where: { restaurantId: tenant.id, active: true },
    });

    let operator: Awaited<ReturnType<typeof db.operator.findMany>>[number] | null = null;
    for (const op of operators) {
      if (verifyPin(pin, op.pin)) {
        operator = op;
        break;
      }
    }

    if (!operator) {
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
    await resetRateLimit(rateLimitKey);

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

