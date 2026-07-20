import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/vouchers — seznam vavčerjev
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const activeFilter = req.nextUrl.searchParams.get("active");

    const where: { restaurantId: string; active?: boolean } = { restaurantId: tenant.id };
    if (activeFilter === "true") where.active = true;
    if (activeFilter === "false") where.active = false;

    const vouchers = await db.voucher.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const summary = {
      total: vouchers.length,
      active: vouchers.filter((v) => v.active).length,
      expired: vouchers.filter(
        (v) => v.validUntil && new Date(v.validUntil) < now
      ).length,
      totalUsed: vouchers.reduce((s, v) => s + v.usedCount, 0),
      totalSavings: vouchers.reduce((s, v) => s + v.usedCount * v.value, 0),
    };

    return NextResponse.json({
      vouchers: vouchers.map((v) => ({
        ...v,
        validFrom: v.validFrom?.toISOString() || null,
        validUntil: v.validUntil?.toISOString() || null,
        createdAt: v.createdAt.toISOString(),
        isExpired: v.validUntil ? new Date(v.validUntil) < now : false,
        isExhausted: v.usageLimit !== null && v.usedCount >= v.usageLimit,
        remainingUses: v.usageLimit !== null ? v.usageLimit - v.usedCount : null,
      })),
      summary,
    });
  } catch (e) {
    console.error("GET /api/vouchers error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju vavčerjev" }, { status: 500 });
  }
}

// POST /api/vouchers — ustvari nov vavčer
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko upravlja vavčerje" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      code,
      name,
      description,
      type,
      value,
      minOrderValue,
      maxDiscount,
      validFrom,
      validUntil,
      usageLimit,
      categories,
      menuItemIds,
      note,
    } = body as {
      code: string;
      name: string;
      description?: string;
      type: string;
      value: number;
      minOrderValue?: number;
      maxDiscount?: number;
      validFrom?: string;
      validUntil?: string;
      usageLimit?: number;
      categories?: string | string[];
      menuItemIds?: string | string[];
      note?: string;
    };

    if (!code || !name || !type || typeof value !== "number") {
      return NextResponse.json(
        { error: "Manjkajoči podatki (code, name, type, value)" },
        { status: 400 }
      );
    }

    const validTypes = ["percent", "fixed", "item_free", "buy_x_get_y"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Neveljaven tip" }, { status: 400 });
    }

    // Preveri unikatnost kode
    const existing = await db.voucher.findFirst({
      where: { restaurantId: tenant.id, code: code.toUpperCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Vavčer s kodo ${code} že obstaja` },
        { status: 400 }
      );
    }

    const voucher = await db.voucher.create({
      data: {
        restaurantId: tenant.id,
        code: code.toUpperCase(),
        name,
        description: description || null,
        type,
        value,
        minOrderValue: minOrderValue || 0,
        maxDiscount: maxDiscount || null,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        usageLimit: usageLimit || null,
        categories: typeof categories === "string"
          ? categories
          : categories
          ? JSON.stringify(categories)
          : "all",
        menuItemIds: typeof menuItemIds === "string"
          ? menuItemIds
          : menuItemIds
          ? JSON.stringify(menuItemIds)
          : "all",
        note: note || null,
        active: true,
      },
    });

    return NextResponse.json(voucher, { status: 201 });
  } catch (e) {
    console.error("POST /api/vouchers error:", e);
    return NextResponse.json({ error: "Napaka pri ustvarjanju vavčerja" }, { status: 500 });
  }
}
