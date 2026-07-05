import { test, expect } from "@playwright/test";

test.describe("Authentication flow", () => {
  test("unauthenticated API requests return 401", async ({ request }) => {
    const response = await request.get("/api/auth/me");
    expect(response.status()).toBe(401);
  });

  test("protected routes without auth return 401", async ({ request }) => {
    const routes = ["/api/z-report", "/api/orders/export"];
    for (const route of routes) {
      const response = await request.get(route);
      expect(response.status(), `${route} should be 401`).toBe(401);
    }
  });

  test("/api/restaurants does not leak sensitive fields", async ({ request }) => {
    const response = await request.get("/api/restaurants");
    expect(response.status()).toBe(200);
    const restaurants = await response.json();
    for (const r of restaurants) {
      expect(r).not.toHaveProperty("taxNumber");
      expect(r).not.toHaveProperty("email");
      expect(r).not.toHaveProperty("phone");
      expect(r).not.toHaveProperty("address");
    }
  });

  test("brute force protection locks after 5 failed attempts", async ({ request }) => {
    const attempts: number[] = [];
    for (let i = 0; i < 7; i++) {
      const response = await request.post("/api/auth/login", {
        data: { pin: "0000", restaurantSlug: "gostilna-pri-marku" },
      });
      attempts.push(response.status());
    }
    expect(attempts.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(attempts[5]).toBe(429);
    expect(attempts[6]).toBe(429);
  });

  test("successful login returns operator data", async ({ request }) => {
    const response = await request.post("/api/auth/login", {
      data: { pin: "1234", restaurantSlug: "gostilna-pri-marku" },
    });
    expect(response.status()).toBe(200);
    const operator = await response.json();
    expect(operator).toHaveProperty("id");
    expect(operator).toHaveProperty("name");
    expect(operator).not.toHaveProperty("pin");
  });
});
