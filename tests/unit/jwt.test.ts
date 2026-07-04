import { describe, it, expect, beforeAll } from "vitest";
import { signLoyaltyToken, verifyLoyaltyToken } from "@/lib/jwt";

describe("Loyalty JWT tokens", () => {
  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = "test-secret-for-vitest";
  });

  it("signs a token with 3 parts (header.payload.signature)", () => {
    const token = signLoyaltyToken("customer-123", "restaurant-456");
    const parts = token.split(".");
    expect(parts.length).toBe(3);
  });

  it("verifies a valid token", () => {
    const token = signLoyaltyToken("customer-123", "restaurant-456");
    const payload = verifyLoyaltyToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.customerId).toBe("customer-123");
    expect(payload?.restaurantId).toBe("restaurant-456");
    expect(payload?.exp).toBeGreaterThan(payload!.iat);
  });

  it("rejects invalid token (wrong format)", () => {
    const result = verifyLoyaltyToken("invalid-token");
    expect(result).toBeNull();
  });

  it("rejects token with wrong signature", () => {
    // Sign with one secret, verify with another
    process.env.NEXTAUTH_SECRET = "secret-a";
    const token = signLoyaltyToken("cust-1", "rest-1");
    process.env.NEXTAUTH_SECRET = "secret-b";
    const result = verifyLoyaltyToken(token);
    expect(result).toBeNull();
  });

  it("rejects expired token", () => {
    // Manually create an expired token
    process.env.NEXTAUTH_SECRET = "test-secret";
    const crypto = require("crypto");
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(JSON.stringify({
      customerId: "cust-1",
      restaurantId: "rest-1",
      iat: now - 100,
      exp: now - 50, // expired 50s ago
    })).toString("base64url");
    const data = `${header}.${payload}`;
    const sig = crypto.createHmac("sha256", "test-secret").update(data).digest("base64url");
    const token = `${data}.${sig}`;
    
    const result = verifyLoyaltyToken(token);
    expect(result).toBeNull();
  });
});
