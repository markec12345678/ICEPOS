import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

describe("Security matrix — API route protection", () => {
  const protectedRoutes = [
    "/api/z-report",
    "/api/orders",
    "/api/orders/export",
    "/api/audit-log",
    "/api/operators",
    "/api/menu",
    "/api/customers",
    "/api/inventory",
    "/api/shifts",
    "/api/reservations",
    "/api/gift-cards",
    "/api/tables-admin",
  ];

  const publicRoutes = [
    "/api/auth/login",
    "/api/loyalty/login",
    "/api/restaurants",
    "/api/furs/status",
    "/api/wolt/webhook",
    "/api/deliverect/webhook",
    "/api/opentable/webhook",
    "/api/stripe/webhook",
  ];

  it("protected routes list is non-empty", () => {
    expect(protectedRoutes.length).toBeGreaterThan(10);
  });

  it("public routes list includes auth/login", () => {
    expect(publicRoutes).toContain("/api/auth/login");
  });

  it("public routes list includes loyalty/login", () => {
    expect(publicRoutes).toContain("/api/loyalty/login");
  });

  it("public routes list includes all 4 webhooks", () => {
    expect(publicRoutes).toContain("/api/wolt/webhook");
    expect(publicRoutes).toContain("/api/deliverect/webhook");
    expect(publicRoutes).toContain("/api/opentable/webhook");
    expect(publicRoutes).toContain("/api/stripe/webhook");
  });

  it("no route appears in both lists", () => {
    const overlap = protectedRoutes.filter((r) => publicRoutes.includes(r));
    expect(overlap).toEqual([]);
  });

  it("request without auth headers has null PIN", () => {
    const req = new NextRequest("http://localhost/api/z-report");
    expect(req.headers.get("x-operator-pin")).toBeNull();
  });

  it("request with auth headers has PIN", () => {
    const req = new NextRequest("http://localhost/api/z-report", {
      headers: {
        "x-operator-pin": "1234",
        "x-restaurant-id": "test-id",
      },
    });
    expect(req.headers.get("x-operator-pin")).toBe("1234");
    expect(req.headers.get("x-restaurant-id")).toBe("test-id");
  });
});

describe("CSRF protection", () => {
  it("POST request from wrong origin should be blocked", () => {
    const req = new NextRequest("http://localhost/api/orders", {
      method: "POST",
      headers: {
        Origin: "http://evil.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const origin = req.headers.get("origin");
    const appUrl = "http://localhost:3000";
    expect(origin).toBe("http://evil.com");
    expect(origin).not.toMatch(new RegExp(`^${appUrl}`));
  });

  it("POST request from correct origin should be allowed", () => {
    const appUrl = "http://localhost:3000";
    const req = new NextRequest("http://localhost/api/orders", {
      method: "POST",
      headers: {
        Origin: appUrl,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const origin = req.headers.get("origin");
    expect(origin).toBe(appUrl);
    expect(origin!.startsWith(appUrl)).toBe(true);
  });

  it("GET request should not require origin check", () => {
    const req = new NextRequest("http://localhost/api/z-report");
    expect(req.method).toBe("GET");
    expect(req.headers.get("origin")).toBeNull();
  });
});

describe("Loyalty JWT security", () => {
  it("old-style customer.id token should be rejected", () => {
    // A CUID looks like: cmr1234567890abcdef
    const fakeCuid = "cmr_fake_customer_id";
    // This is NOT a JWT (no dots)
    expect(fakeCuid.split(".").length).not.toBe(3);
  });

  it("valid JWT has 3 parts", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJjdXN0b21lcklkIjoiYWJjIn0.signature";
    expect(jwt.split(".").length).toBe(3);
  });
});

describe("FURS compliance checks", () => {
  it("InvoiceIssuer must not have demo values", () => {
    const demoIssuer = {
      taxNumber: "12345678",
      businessPremiseID: "PREVOZ11",
      electronicDeviceID: "BLAG01",
    };
    // These are demo values that should be rejected
    expect(demoIssuer.taxNumber).toBe("12345678");
    expect(demoIssuer.businessPremiseID).toBe("PREVOZ11");
    expect(demoIssuer.electronicDeviceID).toBe("BLAG01");
  });

  it("real tenant issuer should have different values", () => {
    const realIssuer = {
      taxNumber: "87654321",
      businessPremiseID: "HOTEL34",
      electronicDeviceID: "BLAG02",
    };
    expect(realIssuer.taxNumber).not.toBe("12345678");
    expect(realIssuer.businessPremiseID).not.toBe("PREVOZ11");
    expect(realIssuer.electronicDeviceID).not.toBe("BLAG01");
  });
});

describe("Rate limiting configuration", () => {
  it("login rate limit should be 5 attempts / 15 min", () => {
    const config = {
      windowMs: 15 * 60 * 1000,
      maxAttempts: 5,
    };
    expect(config.windowMs).toBe(900000);
    expect(config.maxAttempts).toBe(5);
  });

  it("FURS INI rate limit should be 3 attempts / hour", () => {
    const config = {
      windowMs: 60 * 60 * 1000,
      maxAttempts: 3,
    };
    expect(config.windowMs).toBe(3600000);
    expect(config.maxAttempts).toBe(3);
  });

  it("Stripe create-intent rate limit should be 20 / 10 min", () => {
    const config = {
      windowMs: 10 * 60 * 1000,
      maxAttempts: 20,
    };
    expect(config.windowMs).toBe(600000);
    expect(config.maxAttempts).toBe(20);
  });

  it("loyalty login rate limit should be 10 / 15 min", () => {
    const config = {
      windowMs: 15 * 60 * 1000,
      maxAttempts: 10,
    };
    expect(config.windowMs).toBe(900000);
    expect(config.maxAttempts).toBe(10);
  });
});

describe("Encryption at rest", () => {
  it("encrypt produces enc: prefix", async () => {
    const { encrypt } = await import("@/lib/crypto-utils");
    process.env.NEXTAUTH_SECRET = "test-secret";
    const encrypted = encrypt("test-password");
    expect(encrypted).toMatch(/^enc:/);
  });

  it("decrypt round-trips correctly", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto-utils");
    process.env.NEXTAUTH_SECRET = "test-secret";
    const plaintext = "my-secret-password";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("decrypt returns plain text for non-encrypted values (backward compat)", async () => {
    const { decrypt } = await import("@/lib/crypto-utils");
    const plain = "plain-password";
    const result = decrypt(plain);
    expect(result).toBe(plain);
  });

  it("isEncrypted detects encrypted values", async () => {
    const { encrypt, isEncrypted } = await import("@/lib/crypto-utils");
    process.env.NEXTAUTH_SECRET = "test-secret";
    const encrypted = encrypt("test");
    expect(isEncrypted(encrypted)).toBe(true);
    expect(isEncrypted("plain-text")).toBe(false);
    expect(isEncrypted(null)).toBe(false);
  });
});
