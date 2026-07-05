import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock db
vi.mock("@/lib/db", () => ({
  db: {
    operator: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    restaurant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

// Mock rate-limit
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 4, retryAfterMs: 0 }),
  resetRateLimit: vi.fn(),
}));

// Mock Sentry
vi.mock("@/lib/sentry-utils", () => ({
  captureException: vi.fn(),
}));

import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashPin, verifyPin } from "@/lib/auth";

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects missing PIN", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects PIN that is too short", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ pin: "12", restaurantSlug: "test" }),
    });
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects PIN that is too long", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ pin: "123456789", restaurantSlug: "test" }),
    });
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent restaurant", async () => {
    vi.mocked(db.restaurant.findUnique).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ pin: "1234", restaurantSlug: "nonexistent" }),
    });
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 429 when rate limit exceeded", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      retryAfterMs: 900000,
    });
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ pin: "1234", restaurantSlug: "test" }),
    });
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(req);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });
});

describe("PIN security", () => {
  it("hashPin produces scrypt format", () => {
    const hash = hashPin("1234");
    expect(hash).toMatch(/^scrypt:[a-f0-9]+:[a-f0-9]+$/);
  });

  it("hashPin produces different hashes for same PIN (random salt)", () => {
    const h1 = hashPin("1234");
    const h2 = hashPin("1234");
    expect(h1).not.toBe(h2);
  });

  it("verifyPin accepts correct PIN", () => {
    const hash = hashPin("9999");
    expect(verifyPin("9999", hash)).toBe(true);
  });

  it("verifyPin rejects wrong PIN", () => {
    const hash = hashPin("9999");
    expect(verifyPin("0000", hash)).toBe(false);
  });

  it("verifyPin handles legacy plaintext PINs", () => {
    expect(verifyPin("1234", "1234")).toBe(true);
    expect(verifyPin("9999", "1234")).toBe(false);
  });

  it("verifyPin rejects empty/null", () => {
    expect(verifyPin("", "1234")).toBe(false);
    expect(verifyPin("1234", "")).toBe(false);
    expect(verifyPin("", "")).toBe(false);
  });
});
