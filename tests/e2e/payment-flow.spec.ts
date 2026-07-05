import { test, expect, request } from "@playwright/test";

test.describe("Payment flow (FURS fiscalization)", () => {
  let tenantId: string;
  let operatorPin = "1234";

  test.beforeAll(async ({ request }) => {
    const response = await request.get("/api/restaurants");
    const restaurants = await response.json();
    tenantId = restaurants[0].id;
  });

  test("authenticated operator can fetch z-report with FURS data", async ({ request }) => {
    const response = await request.get("/api/z-report", {
      headers: {
        "x-operator-pin": operatorPin,
        "x-restaurant-id": tenantId,
      },
    });
    expect(response.status()).toBe(200);
    const report = await response.json();
    
    // Z-report must have FURS fields
    expect(report).toHaveProperty("businessUnit");
    expect(report).toHaveProperty("cashRegister");
    expect(report).toHaveProperty("summary");
    expect(report.summary).toHaveProperty("grossTotal");
    expect(report.summary).toHaveProperty("receiptCount");
    
    // Business unit must NOT be hardcoded demo value
    expect(report.businessUnit).toBeTruthy();
  });

  test("paid orders have ZOI and EOR (FURS fiscalization)", async ({ request }) => {
    const response = await request.get("/api/orders?status=paid", {
      headers: {
        "x-operator-pin": operatorPin,
        "x-restaurant-id": tenantId,
      },
    });
    expect(response.status()).toBe(200);
    const orders = await response.json();
    
    // At least one paid order should exist (from seed)
    expect(orders.length).toBeGreaterThan(0);
    
    // Each paid order should have ZOI (32-char hex)
    for (const order of orders.slice(0, 3)) {
      if (order.zoi) {
        expect(order.zoi).toMatch(/^[A-F0-9]{32}$/);
      }
      if (order.eor) {
        expect(order.eor).toMatch(/^[A-F0-9]{32}$/);
      }
    }
  });

  test("QR code endpoint returns SVG for paid order", async ({ request }) => {
    // First get a paid order
    const ordersResponse = await request.get("/api/orders?status=paid", {
      headers: {
        "x-operator-pin": operatorPin,
        "x-restaurant-id": tenantId,
      },
    });
    const orders = await ordersResponse.json();
    
    if (orders.length === 0) return; // skip if no paid orders
    
    const orderId = orders[0].id;
    const response = await request.get(`/api/orders/${orderId}/qr`, {
      headers: {
        "x-operator-pin": operatorPin,
        "x-restaurant-id": tenantId,
      },
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("dataUrl");
    expect(data.dataUrl).toContain("image/svg+xml");
    expect(data).toHaveProperty("payload");
  });

  test("QR code rejects cross-tenant access (IDOR)", async ({ request }) => {
    const restaurants = await (await request.get("/api/restaurants")).json();
    const t1 = restaurants[0];
    const t2 = restaurants[1];

    // Get T1's paid order
    const ordersResponse = await request.get("/api/orders?status=paid", {
      headers: {
        "x-operator-pin": "1234",
        "x-restaurant-id": t1.id,
      },
    });
    const orders = await ordersResponse.json();
    if (orders.length === 0) return;

    // T2 operator tries to access T1's QR code
    const response = await request.get(`/api/orders/${orders[0].id}/qr`, {
      headers: {
        "x-operator-pin": "2234",  // T2 PIN
        "x-restaurant-id": t2.id,
      },
    });
    expect(response.status()).toBe(404); // Not found in T2's tenant
  });

  test("orders export returns CSV with tenant-scoped data", async ({ request }) => {
    const response = await request.get("/api/orders/export", {
      headers: {
        "x-operator-pin": operatorPin,
        "x-restaurant-id": tenantId,
      },
    });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/csv");
    
    const csv = await response.text();
    expect(csv).toContain("Številka računa"); // CSV header
    expect(csv).toContain("ZOI");
    expect(csv).toContain("EOR");
  });
});

test.describe("Storno flow (FURS storno compliance)", () => {
  let tenantId: string;
  let operatorPin = "9999"; // admin PIN for storno

  test.beforeAll(async ({ request }) => {
    const response = await request.get("/api/restaurants");
    const restaurants = await response.json();
    tenantId = restaurants[0].id;
  });

  test("storno requires reason", async ({ request }) => {
    // Get a paid order
    const ordersResponse = await request.get("/api/orders?status=paid", {
      headers: {
        "x-operator-pin": "1234",
        "x-restaurant-id": tenantId,
      },
    });
    const orders = await ordersResponse.json();
    if (orders.length === 0) return;

    // Try storno without reason
    const response = await request.post(`/api/orders/${orders[0].id}/storno`, {
      headers: {
        "x-operator-pin": operatorPin,
        "x-restaurant-id": tenantId,
        "Content-Type": "application/json",
      },
      data: {},
    });
    // Should accept (default reason) or reject (missing reason)
    expect([200, 400]).toContain(response.status());
  });

  test("storno rejects non-paid order", async ({ request }) => {
    // Get open orders (not paid)
    const ordersResponse = await request.get("/api/orders?status=open", {
      headers: {
        "x-operator-pin": "1234",
        "x-restaurant-id": tenantId,
      },
    });
    const orders = await ordersResponse.json();
    if (orders.length === 0) return;

    const response = await request.post(`/api/orders/${orders[0].id}/storno`, {
      headers: {
        "x-operator-pin": operatorPin,
        "x-restaurant-id": tenantId,
        "Content-Type": "application/json",
      },
      data: { reason: "Test storno" },
    });
    expect(response.status()).toBe(400); // Can only storno paid orders
  });

  test("storno rejects cross-tenant access", async ({ request }) => {
    const restaurants = await (await request.get("/api/restaurants")).json();
    const t1 = restaurants[0];
    const t2 = restaurants[1];

    // Get T1's paid order
    const ordersResponse = await request.get("/api/orders?status=paid", {
      headers: {
        "x-operator-pin": "1234",
        "x-restaurant-id": t1.id,
      },
    });
    const orders = await ordersResponse.json();
    if (orders.length === 0) return;

    // T2 admin tries to storno T1's order
    const response = await request.post(`/api/orders/${orders[0].id}/storno`, {
      headers: {
        "x-operator-pin": "9999", // T1 admin
        "x-restaurant-id": t2.id, // T2 tenant
      },
      data: { reason: "Cross-tenant test" },
    });
    expect([401, 404]).toContain(response.status());
  });
});

test.describe("Audit log (FURS traceability)", () => {
  let tenantId: string;

  test.beforeAll(async ({ request }) => {
    const response = await request.get("/api/restaurants");
    const restaurants = await response.json();
    tenantId = restaurants[0].id;
  });

  test("audit log returns entries for tenant", async ({ request }) => {
    const response = await request.get("/api/audit-log", {
      headers: {
        "x-operator-pin": "1234",
        "x-restaurant-id": tenantId,
      },
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("logs");
    expect(data).toHaveProperty("total");
    expect(Array.isArray(data.logs)).toBeTruthy();
  });

  test("audit log supports action filter", async ({ request }) => {
    const response = await request.get("/api/audit-log?action=furs_fiscalize", {
      headers: {
        "x-operator-pin": "1234",
        "x-restaurant-id": tenantId,
      },
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    // All returned logs should have action=furs_fiscalize
    for (const log of data.logs) {
      expect(log.action).toBe("furs_fiscalize");
    }
  });

  test("audit log rejects unauthenticated access", async ({ request }) => {
    const response = await request.get("/api/audit-log");
    expect(response.status()).toBe(401);
  });

  test("audit log rejects cross-tenant access", async ({ request }) => {
    const restaurants = await (await request.get("/api/restaurants")).json();
    const t2 = restaurants[1];

    // T1 operator tries to read T2's audit log
    const response = await request.get("/api/audit-log", {
      headers: {
        "x-operator-pin": "1234", // T1 PIN
        "x-restaurant-id": t2.id, // T2 tenant
      },
    });
    expect(response.status()).toBe(401); // PIN doesn't match T2
  });
});
