import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/health — health check za Docker/k8s/monitoring
// Preverja: DB povezavo, kitchen service (preko env), Redis (preko env)
export async function GET() {
  const checks: Record<string, { status: string; latency?: number }> = {};
  let allHealthy = true;

  // 1. Database check
  try {
    const start = Date.now();
    await db.restaurant.count({ where: { active: true } });
    checks.database = { status: "ok", latency: Date.now() - start };
  } catch {
    checks.database = { status: "error" };
    allHealthy = false;
  }

  // 2. Redis check (optional — only if REDIS_URL is set)
  if (process.env.REDIS_URL) {
    try {
      const { checkRateLimit, resetRateLimit } = await import("@/lib/rate-limit");
      // Test by doing a harmless rate limit check
      await checkRateLimit("health-check", { windowMs: 60000, maxAttempts: 999999 });
      await resetRateLimit("health-check");
      checks.redis = { status: "ok" };
    } catch {
      checks.redis = { status: "degraded" };
      // Redis degradation is not critical (falls back to in-memory)
    }
  } else {
    checks.redis = { status: "not-configured" };
  }

  // 3. FURS cert check (optional)
  if (process.env.FURS_PRIVATE_KEY || process.env.FURS_CERT_PATH) {
    checks.furs = { status: "configured" };
  } else {
    checks.furs = { status: "not-configured" };
  }

  return NextResponse.json(
    {
      status: allHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  );
}
