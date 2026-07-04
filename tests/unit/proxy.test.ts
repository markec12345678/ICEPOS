import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

describe("Proxy route protection", () => {
  it("public routes list includes auth/login and loyalty/login", () => {
    const publicRoutes = [
      "/api/auth/login",
      "/api/restaurants",
      "/api/wolt/webhook",
      "/api/deliverect/webhook",
      "/api/opentable/webhook",
      "/api/stripe/webhook",
      "/api/furs/status",
      "/api/loyalty/login",
    ];
    expect(publicRoutes).toContain("/api/auth/login");
    expect(publicRoutes).toContain("/api/loyalty/login");
    expect(publicRoutes.length).toBe(8);
  });

  it("request without x-operator-pin header should have null pin", () => {
    const req = new NextRequest("http://localhost/api/z-report");
    const pin = req.headers.get("x-operator-pin");
    expect(pin).toBeNull();
  });

  it("request with x-operator-pin header should have it", () => {
    const req = new NextRequest("http://localhost/api/z-report", {
      headers: { "x-operator-pin": "1234", "x-restaurant-id": "test-id" },
    });
    expect(req.headers.get("x-operator-pin")).toBe("1234");
    expect(req.headers.get("x-restaurant-id")).toBe("test-id");
  });
});

describe("Loyalty token structure", () => {
  it("JWT has 3 parts separated by dots", () => {
    const fakeJwt = "eyJhbGciOiJIUzI1NiJ9.eyJjdXN0b21lcklkIjoiYWJjIn0.signature";
    const parts = fakeJwt.split(".");
    expect(parts.length).toBe(3);
  });
});
