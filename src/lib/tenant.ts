import { NextRequest } from "next/server";
import { db } from "./db";

// ============================================================
// TENANT HELPER — multi-tenant podpora
// ============================================================
// Prebere restaurantId iz:
//   1. x-restaurant-id header (najbolj zanesljivo)
//   2. x-restaurant-slug header (slug restavracije)
//   3. query param ?restaurant=slug
// BREZ fallback-a — vrne null če tenant ni eksplicitno naveden.
// (Prejšnji fallback na "prvo aktivno restavracijo" je bil varnostna
//  luknja — brez header-ja je zahtevek tiho operational na napačni tenant-i.)
// ============================================================

export interface TenantRestaurant {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  taxNumber: string;
  businessUnit: string;
  cashRegister: string;
  fursEnv: string;
  loyaltyRate: number;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
}

export async function getTenantFromRequest(
  req: NextRequest
): Promise<TenantRestaurant | null> {
  try {
    // 1. x-restaurant-id header
    const idFromHeader = req.headers.get("x-restaurant-id");
    if (idFromHeader) {
      const r = await db.restaurant.findUnique({ where: { id: idFromHeader } });
      if (r && r.active) return toTenant(r);
    }

    // 2. x-restaurant-slug header
    const slugFromHeader = req.headers.get("x-restaurant-slug");
    if (slugFromHeader) {
      const r = await db.restaurant.findUnique({ where: { slug: slugFromHeader } });
      if (r && r.active) return toTenant(r);
    }

    // 3. query param
    const slugFromQuery = req.nextUrl.searchParams.get("restaurant");
    if (slugFromQuery) {
      const r = await db.restaurant.findUnique({ where: { slug: slugFromQuery } });
      if (r && r.active) return toTenant(r);
    }

    // BREZ fallback-a — tenant mora biti eksplicitno naveden.
    return null;
  } catch (e) {
    console.error("getTenantFromRequest error:", e);
    return null;
  }
}

function toTenant(r: {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  taxNumber: string;
  businessUnit: string;
  cashRegister: string;
  fursEnv: string;
  loyaltyRate: number;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
}): TenantRestaurant {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    subdomain: r.subdomain,
    taxNumber: r.taxNumber,
    businessUnit: r.businessUnit,
    cashRegister: r.cashRegister,
    fursEnv: r.fursEnv,
    loyaltyRate: r.loyaltyRate,
    address: r.address,
    city: r.city,
    phone: r.phone,
    email: r.email,
  };
}

// Vrne vse restavracije (za admin/selector)
export async function getAllRestaurants(): Promise<TenantRestaurant[]> {
  const all = await db.restaurant.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return all.map(toTenant);
}
