import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";
import { registerDeviceToFurs } from "@/lib/furs-api";
import { writeAuditLog, getIpAddress } from "@/lib/audit";

export const dynamic = "force-dynamic";

// POST /api/furs/ini — registriraj napravo pri FURS (INI postopek)
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko izvede INI registracijo" },
        { status: 403 }
      );
    }

    const restaurant = await db.restaurant.findUnique({
      where: { id: tenant.id },
      select: {
        taxNumber: true,
        businessUnit: true,
        cashRegister: true,
        fursEnv: true,
        fursCertPath: true,
        fursCertPassword: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 404 });
    }

    if (!restaurant.fursCertPath) {
      return NextResponse.json(
        { error: "FURS certifikat ni naložen. Naloži .p12 datoteko v nastavitvah." },
        { status: 400 }
      );
    }

    const result = await registerDeviceToFurs({
      env: restaurant.fursEnv as "test" | "prod",
      certPath: restaurant.fursCertPath,
      certPassword: restaurant.fursCertPassword || "",
      taxNumber: restaurant.taxNumber,
    });

    if (result.success) {
      // Audit log — FURS INI registracija
      await writeAuditLog({
        restaurantId: tenant.id,
        operatorName: authOp?.name,
        ipAddress: getIpAddress(req),
        action: "furs_ini",
        entityType: "restaurant",
        entityId: tenant.id,
        description: `INI registracija naprave ${tenant.businessUnit}-${tenant.cashRegister}`,
        newValue: { businessUnit: tenant.businessUnit, cashRegister: tenant.cashRegister },
        success: true,
      });
      
      return NextResponse.json({ ok: true, message: result.message });
    }
    return NextResponse.json({ error: result.message }, { status: 400 });
  } catch (e) {
    console.error("POST /api/furs/ini error:", e);
    return NextResponse.json({ error: "Napaka pri INI registraciji" }, { status: 500 });
  }
}
