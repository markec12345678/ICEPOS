import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/delivery-zones — seznam con dostave
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const zones = await db.deliveryZone.findMany({
      where: { restaurantId: tenant.id },
      orderBy: { name: "asc" },
    });

    const summary = {
      total: zones.length,
      active: zones.filter((z) => z.active).length,
      avgDeliveryFee: zones.length > 0
        ? zones.reduce((s, z) => s + z.deliveryFee, 0) / zones.length
        : 0,
      avgMinOrder: zones.length > 0
        ? zones.reduce((s, z) => s + z.minOrderValue, 0) / zones.length
        : 0,
      avgTime: zones.length > 0
        ? Math.round(zones.reduce((s, z) => s + z.estimatedTime, 0) / zones.length)
        : 0,
      totalPostalCodes: zones.reduce(
        (s, z) => {
          try {
            const codes = JSON.parse(z.postalCodes) as string[];
            return s + codes.length;
          } catch {
            return s;
          }
        },
        0
      ),
    };

    return NextResponse.json({
      zones: zones.map((z) => ({
        ...z,
        postalCodes: (() => {
          try {
            return JSON.parse(z.postalCodes) as string[];
          } catch {
            return [];
          }
        })(),
        createdAt: z.createdAt.toISOString(),
      })),
      summary,
    });
  } catch (e) {
    console.error("GET /api/delivery-zones error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju con dostave" }, { status: 500 });
  }
}

// POST /api/delivery-zones — ustvari novo cono
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko upravlja cone dostave" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      postalCodes,
      minOrderValue,
      deliveryFee,
      freeDeliveryThreshold,
      estimatedTime,
      note,
    } = body as {
      name: string;
      postalCodes: string[];
      minOrderValue?: number;
      deliveryFee?: number;
      freeDeliveryThreshold?: number;
      estimatedTime?: number;
      note?: string;
    };

    if (!name || !postalCodes || !Array.isArray(postalCodes) || postalCodes.length === 0) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (name, postalCodes)" },
        { status: 400 }
      );
    }

    const zone = await db.deliveryZone.create({
      data: {
        restaurantId: tenant.id,
        name,
        postalCodes: JSON.stringify(postalCodes),
        minOrderValue: minOrderValue || 0,
        deliveryFee: deliveryFee || 0,
        freeDeliveryThreshold: freeDeliveryThreshold || null,
        estimatedTime: estimatedTime || 30,
        note: note || null,
        active: true,
      },
    });

    return NextResponse.json(zone, { status: 201 });
  } catch (e) {
    console.error("POST /api/delivery-zones error:", e);
    return NextResponse.json({ error: "Napaka pri ustvarjanju cone" }, { status: 500 });
  }
}
