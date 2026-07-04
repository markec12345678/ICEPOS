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
];

// In-memory PIN lookup cache (5s TTL) — zmanjša DB obremenitev.
const pinCache = new Map<string, { valid: boolean; ts: number }>();
const PIN_CACHE_TTL = 5_000;

async function validateOperator(tenantId: string, pin: string): Promise<boolean> {
  const cacheKey = `${tenantId}:${pin}`;
  const cached = pinCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < PIN_CACHE_TTL) {
    return cached.valid;
  }

  const operators = await db.operator.findMany({
    where: { restaurantId: tenantId, active: true },
    select: { id: true, pin: true },
  });

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
    const restaurant = await db.restaurant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    });
    return restaurant?.id ?? null;
  }

  const restaurantQuery = req.nextUrl.searchParams.get("restaurant");
  if (restaurantQuery) {
    const restaurant = await db.restaurant.findUnique({
      where: { slug: restaurantQuery },
      select: { id: true },
    });
    return restaurant?.id ?? null;
  }

  return null;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
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
