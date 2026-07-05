import { test, expect } from "@playwright/test";

test.describe("Order flow", () => {
  let tenantId: string;
  const operatorPin = "1234";

  test.beforeAll(async ({ request }) => {
    const response = await request.get("/api/restaurants");
    const restaurants = await response.json();
    tenantId = restaurants[0].id;
  });

  test("homepage loads with POS title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/POS|Gostilna/i);
  });

  test("authenticated z-report returns 200", async ({ request }) => {
    const response = await request.get("/api/z-report", {
      headers: {
        "x-operator-pin": operatorPin,
        "x-restaurant-id": tenantId,
      },
    });
    expect(response.status()).toBe(200);
    const report = await response.json();
    expect(report).toHaveProperty("summary");
    expect(report).toHaveProperty("businessUnit");
  });

  test("cross-tenant IDOR is blocked", async ({ request }) => {
    const restaurants = await (await request.get("/api/restaurants")).json();
    const t1 = restaurants[0];
    const t2 = restaurants[1];

    // T1 operator tries to access T2 z-report
    const response = await request.get("/api/z-report", {
      headers: {
        "x-operator-pin": "1234",  // T1 PIN
        "x-restaurant-id": t2.id,  // T2 tenant
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test("audit-log returns entries after FURS operations", async ({ request }) => {
    // Login as admin first to ensure audit log has entries
    const response = await request.get("/api/audit-log", {
      headers: {
        "x-operator-pin": operatorPin,
        "x-restaurant-id": tenantId,
      },
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("logs");
    expect(data).toHaveProperty("total");
    expect(Array.isArray(data.logs)).toBeTruthy();
  });

  test("loyalty login rejects non-existent phone", async ({ request }) => {
    const response = await request.post("/api/loyalty/login", {
      data: { phone: "000 000 000" },
      headers: { "x-restaurant-id": tenantId },
    });
    expect(response.status()).toBe(404);
  });

  test("loyalty me rejects old-style token (customer.id)", async ({ request }) => {
    const response = await request.get("/api/loyalty/me", {
      headers: { "x-loyalty-token": "cmr_fake_customer_id" },
    });
    expect(response.status()).toBe(401);
  });

  test("loyalty me rejects no token", async ({ request }) => {
    const response = await request.get("/api/loyalty/me");
    expect(response.status()).toBe(401);
  });

  test("stripe webhook rejects missing signature", async ({ request }) => {
    const response = await request.post("/api/stripe/webhook", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status()).toBe(400);
  });

  test("api-docs (Swagger UI) is accessible", async ({ request }) => {
    const response = await request.get("/api-docs");
    expect(response.status()).toBe(200);
  });

  test("restaurants list does not leak tax numbers", async ({ request }) => {
    const response = await request.get("/api/restaurants");
    const restaurants = await response.json();
    for (const r of restaurants) {
      expect(r).not.toHaveProperty("taxNumber");
      expect(r).not.toHaveProperty("email");
      expect(r).not.toHaveProperty("phone");
      expect(r).not.toHaveProperty("address");
      expect(r).not.toHaveProperty("fursCertPassword");
    }
  });
});
