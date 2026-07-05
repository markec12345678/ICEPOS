export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Gostilna POS API",
    description: "Slovenska restavracijska blagajna (POS) — FURS skladna, multi-tenant SaaS",
    version: "1.0.0",
  },
  servers: [
    { url: "http://localhost:3000", description: "Development" },
  ],
  components: {
    securitySchemes: {
      operatorPin: { type: "apiKey", in: "header", name: "x-operator-pin" },
      tenantId: { type: "apiKey", in: "header", name: "x-restaurant-id" },
    },
  },
  tags: [
    { name: "Auth", description: "Avtentikacija" },
    { name: "Orders", description: "Naročila in računi" },
    { name: "FURS", description: "Fiskalizacija" },
    { name: "Payments", description: "Plačila" },
    { name: "Reports", description: "Poročila" },
    { name: "Public", description: "Javni endpoint-i" },
  ],
  paths: {
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Prijava operaterja (PIN + tenantSlug)",
        security: [],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { pin: { type: "string" }, restaurantSlug: { type: "string" } } } } } },
        responses: { "200": { description: "Uspešna prijava" }, "401": { description: "Napačen PIN" }, "429": { description: "Preveč poskusov" } },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Trenutni operater",
        security: [{ operatorPin: [], tenantId: [] }],
        responses: { "200": { description: "Operater podatki" }, "401": { description: "Ni prijavljen" } },
      },
    },
    "/api/restaurants": {
      get: {
        tags: ["Public"],
        summary: "Seznam restavracij (minimalni podatki)",
        security: [],
        responses: { "200": { description: "Seznam" } },
      },
      post: {
        tags: ["Public"],
        summary: "Ustvari restavracijo (super-admin only)",
        security: [],
        parameters: [{ name: "x-super-admin-key", in: "header", required: true, schema: { type: "string" } }],
        responses: { "201": { description: "Ustvarjeno" }, "403": { description: "Dostop zavrnjen" } },
      },
    },
    "/api/furs/status": {
      get: { tags: ["FURS", "Public"], summary: "Status FURS strežnika", security: [], responses: { "200": { description: "Status" } } },
    },
    "/api/furs/ini": {
      post: { tags: ["FURS"], summary: "INI registracija naprave pri FURS", security: [{ operatorPin: [], tenantId: [] }], responses: { "200": { description: "Registrirano" } } },
    },
    "/api/orders": {
      get: { tags: ["Orders"], summary: "Seznam naročil", security: [{ operatorPin: [], tenantId: [] }], responses: { "200": { description: "Seznam" } } },
      post: { tags: ["Orders"], summary: "Ustvari naročilo", security: [{ operatorPin: [], tenantId: [] }], responses: { "201": { description: "Ustvarjeno" } } },
    },
    "/api/orders/{id}/pay": {
      post: {
        tags: ["Orders", "FURS"],
        summary: "Plačaj naročilo (FURS fiskalizacija + inventory + loyalty)",
        security: [{ operatorPin: [], tenantId: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Plačano" }, "404": { description: "Ni najdeno" }, "500": { description: "FURS napaka" } },
      },
    },
    "/api/orders/{id}/storno": {
      post: {
        tags: ["Orders", "FURS"],
        summary: "Storniraj račun (FURS storno + $transaction)",
        security: [{ operatorPin: [], tenantId: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Stornirano" }, "400": { description: "Že storniran" } },
      },
    },
    "/api/orders/{id}/qr": {
      get: { tags: ["Orders", "FURS"], summary: "QR koda računa (FURS)", security: [{ operatorPin: [], tenantId: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "SVG" } } },
    },
    "/api/z-report": {
      get: { tags: ["Reports", "FURS"], summary: "Z-report (dnevni zaključek)", security: [{ operatorPin: [], tenantId: [] }], responses: { "200": { description: "Z-report" } } },
    },
    "/api/stripe/create-intent": {
      post: { tags: ["Payments"], summary: "Stripe PaymentIntent (Apple Pay/Google Pay)", security: [{ operatorPin: [], tenantId: [] }], responses: { "200": { description: "Client secret" } } },
    },
    "/api/stripe/webhook": {
      post: { tags: ["Payments"], summary: "Stripe webhook (signature verified)", security: [], responses: { "200": { description: "Prejeto" }, "400": { description: "Neveljaven podpis" } } },
    },
    "/api/wolt/webhook": { post: { tags: ["Payments"], summary: "Wolt webhook (HMAC verified)", security: [], responses: { "200": { description: "Prejeto" } } } },
    "/api/deliverect/webhook": { post: { tags: ["Payments"], summary: "Deliverect webhook (HMAC verified)", security: [], responses: { "200": { description: "Prejeto" } } } },
    "/api/opentable/webhook": { post: { tags: ["Payments"], summary: "OpenTable webhook (HMAC verified)", security: [], responses: { "200": { description: "Prejeto" } } } },

    "/api/orders/{id}/void-item": {
      post: { tags: ["Orders"], summary: "Odstrani postavko iz naročila", security: [{ operatorPin: [], tenantId: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Odstranjeno" } } },
    },
    "/api/orders/{id}/transfer-table": {
      post: { tags: ["Orders"], summary: "Prenesi naročilo na drugo mizo", security: [{ operatorPin: [], tenantId: [] }], responses: { "200": { description: "Preneseno" } } },
    },
    "/api/orders/{id}/send-to-kitchen": {
      post: { tags: ["Orders"], summary: "Pošlji naročilo v kuhinjo (KDS)", security: [{ operatorPin: [], tenantId: [] }], responses: { "200": { description: "Poslano" } } },
    },
    "/api/orders/{id}/email-receipt": {
      post: { tags: ["Orders"], summary: "Pošlji račun po emailu", security: [{ operatorPin: [], tenantId: [] }], responses: { "200": { description: "Poslano" } } },
    },
    "/api/menu/{id}/generate-image": {
      post: { tags: ["Menu"], summary: "Generiraj AI sliko jedi (ZAI SDK)", security: [{ operatorPin: [], tenantId: [] }], responses: { "200": { description: "Slika generirana" } } },
    },
    "/api/inventory/low-stock": {
      get: { tags: ["Inventory"], summary: "Alerti za nizko zalogo", security: [{ operatorPin: [], tenantId: [] }], responses: { "200": { description: "Alerti" } } },
    },
    "/api/inventory/valuation": {
      get: { tags: ["Inventory"], summary: "Vrednost zaloge", security: [{ operatorPin: [], tenantId: [] }], responses: { "200": { description: "Vrednost" } } },
    },
    "/api/customers/birthdays": {
      get: { tags: ["Customers"], summary: "Rojstni dnevi strank", security: [{ operatorPin: [], tenantId: [] }], responses: { "200": { description: "Seznam" } } },
    },
    "/api/reservations/no-show-stats": {
      get: { tags: ["Reservations"], summary: "Statistika ne-prispetih rezervacij", security: [{ operatorPin: [], tenantId: [] }], responses: { "200": { description: "Statistika" } } },
    },
    "/api/shifts/active": {
      get: { tags: ["Shifts"], summary: "Aktivna smena", security: [{ operatorPin: [], tenantId: [] }], responses: { "200": { description: "Smena" } } },
    },
    "/api/shifts/handover": {
      post: { tags: ["Shifts"], summary: "Predaja smene", security: [{ operatorPin: [], tenantId: [] }], responses: { "200": { description: "Predano" } } },
    },
    "/api/gift-cards": {
      get: { tags: ["GiftCards"], summary: "Seznam darilnih kartic", security: [{ operatorPin: [], tenantId: [] }], responses: { "200": { description: "Seznam" } } },
      post: { tags: ["GiftCards"], summary: "Ustvari darilno kartico", security: [{ operatorPin: [], tenantId: [] }], responses: { "201": { description: "Ustvarjena" } } },
    },
    "/api/audit-log": {
      get: { tags: ["Audit"], summary: "Audit log vnosi (FURS sledljivost)", security: [{ operatorPin: [], tenantId: [] }], parameters: [{ name: "action", in: "query", schema: { type: "string" } }, { name: "limit", in: "query", schema: { type: "integer" } }], responses: { "200": { description: "Audit log" } } },
    },
    "/api/tax-report": {
      get: { tags: ["Reports"], summary: "DDV poročilo", security: [{ operatorPin: [], tenantId: [] }], responses: { "200": { description: "Poročilo" } } },
    },
    "/api/daily-report": {
      get: { tags: ["Reports"], summary: "Dnevno poročilo", security: [{ operatorPin: [], tenantId: [] }], responses: { "200": { description: "Poročilo" } } },
    },
    "/api/sumup/create": {
      post: { tags: ["Payments"], summary: "Sumup terminal plačilo", security: [{ operatorPin: [], tenantId: [] }], responses: { "200": { description: "Terminal checkout" } } },
    },
    "/api/loyalty/wallet": {
      get: { tags: ["Loyalty"], summary: "Stanje predplačilne kartice", security: [{ loyaltyToken: [] }], responses: { "200": { description: "Stanje" } } },
    },
    "/api/loyalty/redeem": {
      post: { tags: ["Loyalty"], summary: "Unovči točke za nagrado", security: [{ loyaltyToken: [] }], responses: { "200": { description: "Unovčeno" } } },
    },

  },
};
