# Arhitektura - Gostilna POS

## Pregled

Gostilna POS je multi-tenant SaaS restavracijska blagajna z FURS skladnostjo.

## Komponente

### 1. Frontend (Next.js 16 App Router)

    Browser (POS/Natakar/Kiosk/Loyalty/CDU/TV)
      |
      v
    Caddy (:443, TLS)
      |
      v
    Next.js 16 App (:3000)
      |-- / (POS blagajna - 34 pogledov)
      |-- /natakar (mobilna aplikacija za natakarje)
      |-- /kiosk (self-service)
      |-- /meni (javni meni)
      |-- /cdu (customer display)
      |-- /zvestoba (loyalty app)
      |-- /sledi/[id] (sledenje naročila)
      |-- /print/receipt/[id] (FURS račun)
      |-- /api-docs (Swagger UI)
      |-- /api/* (152 route handlerjev)

### 2. Backend Services

    Next.js API Routes (:3000)
      |
      |-- src/proxy.ts (avtentikacija + tenant validacija)
      |-- src/lib/auth.ts (scrypt PIN hashing)
      |-- src/lib/jwt.ts (loyalty JWT HS256)
      |-- src/lib/rate-limit.ts (Redis + in-memory fallback)
      |-- src/lib/furs.ts (ZOI/EOR/QR/InvoiceIssuer)
      |-- src/lib/furs-api.ts (SOAP/WS-Security/xml-crypto)
      |-- src/lib/audit.ts (FURS sledljivost)
      |-- src/lib/tenant.ts (multi-tenant resolution)
      |
      v
    Prisma Client -> SQLite/PostgreSQL
      |
      v
    Database (22 modelov, 6 enumov, 29 indeksov)

### 3. Real-time

    Kitchen Display (KDS)
      |
      v
    socket.io-client -> Caddy -> Kitchen Service (:3003)
                                    |
                                    v
                                  in-memory Map (activeOrders)

### 4. External Integrations

    FURS (blagajne-test.fu.gov.si:9002 / blagajne.fu.gov.si:9003)
      ^-- SOAP + WS-Security (exc-c14n, RSA-SHA256) + mTLS

    Stripe (Apple Pay / Google Pay)
      |-- PaymentIntent create
      ^-- Webhook (signature verified)

    Wolt / Deliverect / OpenTable
      ^-- Webhooks (HMAC-SHA256 verified)

    Sumup (kartični terminal)
      |-- Payment requests API

    ZAI SDK (AI slike jedi)
      |-- images.generations.create

### 5. Security Layers

    1. Caddy TLS (Let's Encrypt)
    2. proxy.ts (PIN + tenant header validacija proti DB)
    3. scrypt PIN hashing (16-bajt sol)
    4. Rate limiting (Redis, 5 poskusov / 15 min)
    5. Tenant isolation (restaurantId na vseh query-jih)
    6. Webhook signature verification (HMAC + timingSafeEqual)
    7. JWT loyalty tokens (HS256, 30-dnevni TTL)
    8. Super-admin key za POST /api/restaurants

### 6. Data Integrity

    - $transaction v pay/storno/Stripe webhook (atomsko)
    - FURS mrežni klic IZVEN transakcije (EU pattern)
    - Negativni inventory guard -> rollback
    - Idempotent Stripe webhook
    - AuditLog za vse FURS operacije

## Multi-tenant arhitektura

    Restaurant (tenant)
      |-- restaurantId na 18/22 modelih
      |-- @@unique([restaurantId, pin/phone/code/number])
      |-- Cascade delete
      |-- proxy.ts validira PIN proti tenant DB

## FURS tok

    1. Operater ustvari naročilo
    2. POST /api/orders/[id]/pay
    3. $transaction: order.update(paid) + inventory + giftcard + loyalty
    4. computeZOI (RSA-SHA256 -> MD5)
    5. buildInvoiceXml (z InvoiceIssuer iz tenant)
    6. sendInvoiceToFurs (SOAP + WS-Security + mTLS) -- OUTSIDE tx
    7. AuditLog write
    8. Posodobi order z real EOR

## Deployment

    Docker Compose
      |-- postgres:16-alpine (:5432)
      |-- redis:7-alpine (:6379)
      |-- pos (Next.js, :3000)
      |-- kitchen (socket.io, :3003)

## CI/CD

    GitHub Actions
      |-- lint + typecheck
      |-- unit tests (vitest)
      |-- e2e tests (playwright)
      |-- Docker build
      |-- Trivy security scan
      |-- deploy (SSH + health check)

---

*Zadnja posodobitev: Julij 2025*
