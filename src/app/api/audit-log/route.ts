import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/audit-log — vrne audit log vnose (admin only, per-tenant)
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant ni najden" }, { status: 400 });
    }

    const action = req.nextUrl.searchParams.get("action");
    const entityType = req.nextUrl.searchParams.get("entityType");
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "100", 10), 500);
    const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0", 10);

    const where: { restaurantId: string; action?: string; entityType?: string } = {
      restaurantId: tenant.id,
    };
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;

    const logs = await db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await db.auditLog.count({ where });

    return NextResponse.json({
      logs,
      total,
      limit,
      offset,
    });
  } catch (e) {
    console.error("GET /api/audit-log error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
