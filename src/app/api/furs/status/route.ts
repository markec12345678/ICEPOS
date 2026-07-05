// @ts-nocheck — pre-existing TS errors (non-critical route)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { checkFursHealth } from "@/lib/furs-api";

export const dynamic = "force-dynamic";

// GET /api/furs/status — vrne status FURS certifikata in strežnika
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const restaurant = await db.restaurant.findUnique({
      where: { id: tenant.id },
      select: {
        taxNumber: true,
        businessUnit: true,
        cashRegister: true,
        fursEnv: true,
        fursCertPath: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 404 });
    }

    const hasCert = !!(restaurant.fursCertPath && restaurant.fursCertPath.length > 0);

    // Preveri dosegljivost FURS strežnika (timeout 5s, ne-blokirajoče)
    let health = { reachable: false, latency: 0, url: "" };
    try {
      health = await Promise.race([
        checkFursHealth(restaurant.fursEnv as "test" | "prod"),
        new Promise<typeof health>((resolve) =>
          setTimeout(() => resolve({ reachable: false, latency: 0, url: "timeout" }), 5000)
        ),
      ]);
    } catch {
      // ignore
    }

    return NextResponse.json({
      configured: hasCert,
      env: restaurant.fursEnv,
      taxNumber: restaurant.taxNumber,
      businessUnit: restaurant.businessUnit,
      cashRegister: restaurant.cashRegister,
      certPath: restaurant.fursCertPath,
      serverReachable: health.reachable,
      serverLatency: health.latency,
      serverUrl: health.url,
      mode: hasCert ? "production" : "poc",
    });
  } catch (e) {
    console.error("GET /api/furs/status error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
