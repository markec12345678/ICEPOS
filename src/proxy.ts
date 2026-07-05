import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyPin } from "@/lib/auth";

// ============================================================
// CENTRALNI AVTENTIKACIJSKI PROXY (Next.js 16 "proxy" konvencija)
// ============================================================
// Vsi /api/* zaščiteni zahtevki morajo vsebovati:
//   - x-operator-pin + (x-restaurant-id | x-restaurant-slug) — POS tok
//   - x-loyalty-token — /api/loyalty/* tok (strankina zvestoba)
// Javne (webhook, login, status) so izvzete iz preverjanja tu.
//
// P1 FIX: proxy ne preverja le prisotnosti glav, temveč dejansko
// validira PIN proti tenant-u v DB. Preprečuje cross-tenant IDOR
// (npr. tenant1 PIN z tenant2 restaurant-id).
// ============================================================

const PUBLIC_API_ROUTES = [
  "/api/auth/login",
  "/api/loyalty/login", // issue token — no token required
  "/api/restaurants", // GET samo — vrne minimalne podatke (glej route.ts)
  "/api/wolt/webhook",
  "/api/deliverect/webhook",
  "/api/opentable/webhook",
  "/api/stripe/webhook",
  "/api/furs/status",
  "/api/health", // health check za Docker/k8s
];

// In-memory PIN lookup cache (5s TTL) — zmanjša DB obremenitev.
const pinCache = new Map<string, { valid: boolean; ts: number }>();
const PIN_CACHE_TTL = 5_000;

async function validateOperator(tenantId: string, pin: string): Promise<boolean | "db-error"> {
  // Check cache first (avoids DB hit when DB is down but cache has entry)
  const cacheKey = `${tenantId}:${pin}`;
  const cached = pinCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < PIN_CACHE_TTL) {
    return cached.valid;
  }

  let operators;
  try {
    operators = await db.operator.findMany({
      where: { restaurantId: tenantId, active: true },
      select: { id: true, pin: true },
    });
  } catch {
    // DB error — return special value so proxy can return 503
    return "db-error";
  }

  let valid = false;
  for (const op of operators) {
    if (verifyPin(pin, op.pin)) {
      valid = true;
      break;
    }
  }

  pinCache.set(cacheKey, { valid, ts: Date.now() });
  return valid;
}

async function resolveTenantId(req: NextRequest): Promise<string | null> {
  const tenantId = req.headers.get("x-restaurant-id");
  if (tenantId) return tenantId;

  const tenantSlug = req.headers.get("x-restaurant-slug");
  if (tenantSlug) {
    try {
      const restaurant = await db.restaurant.findUnique({
        where: { slug: tenantSlug },
        select: { id: true },
      });
      return restaurant?.id ?? null;
    } catch {
      return null;
    }
  }

  const restaurantQuery = req.nextUrl.searchParams.get("restaurant");
  if (restaurantQuery) {
    try {
      const restaurant = await db.restaurant.findUnique({
        where: { slug: restaurantQuery },
        select: { id: true },
      });
      return restaurant?.id ?? null;
    } catch {
      return null;
    }
  }

  return null;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // === CSRF protection: za state-changing metode preveri Origin header ===
  const method = req.method.toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const origin = req.headers.get("origin");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    // V dev mode (no APP_URL), dovoli vse
    if (appUrl && origin && !origin.startsWith(appUrl)) {
      // Webhook rute so izvzete — njihov origin je Stripe/Wolt/Deliverect/OpenTable
      const isWebhook = pathname.includes("/webhook");
      if (!isWebhook) {
        return NextResponse.json(
          { error: "Cross-origin request zavrnjen (CSRF zaščita)" },
          { status: 403 }
        );
      }
    }
  }

  // Javne rute
  if (PUBLIC_API_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const pin = req.headers.get("x-operator-pin");
  const tenantIdHeader = req.headers.get("x-restaurant-id");
  const tenantSlugHeader = req.headers.get("x-restaurant-slug");
  const loyaltyToken = req.headers.get("x-loyalty-token");

  // /api/loyalty/* — dovoljen dostop z loyalty žetonom ali operater PIN-om.
  if (pathname.startsWith("/api/loyalty/")) {
    if (loyaltyToken) {
      return NextResponse.next();
    }
    if (pin && (tenantIdHeader || tenantSlugHeader)) {
      const tenantId = await resolveTenantId(req);
      if (!tenantId) {
        return NextResponse.json({ error: "Tenant ni najden" }, { status: 400 });
      }
      const valid = await validateOperator(tenantId, pin);
      if (!valid) {
        return NextResponse.json({ error: "Neveljaven PIN za to restavracijo" }, { status: 401 });
      }
      return NextResponse.next();
    }
    return NextResponse.json({ error: "Avtentikacija potrebna" }, { status: 401 });
  }

  // Vse ostale zaščitene rute zahtevajo operater PIN + tenant glavo.
  if (!pin) {
    return NextResponse.json({ error: "Avtentikacija potrebna" }, { status: 401 });
  }
  if (!tenantIdHeader && !tenantSlugHeader) {
    return NextResponse.json(
      { error: "Tenant header manjka (x-restaurant-id ali x-restaurant-slug)" },
      { status: 400 }
    );
  }

  // P1 FIX: Dejansko validiraj PIN proti tenant-u v DB.
  const tenantId = await resolveTenantId(req);
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant ni najden" }, { status: 400 });
  }

  const valid = await validateOperator(tenantId, pin);
  if (valid === "db-error") {
    return NextResponse.json(
      { error: "Storitev začasno nedosegljiva (DB napaka)" },
      { status: 503 }
    );
  }
  if (!valid) {
    return NextResponse.json(
      { error: "Neveljaven PIN za to restavracijo" },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
