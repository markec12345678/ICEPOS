# Changelog

## [Nepublikovano] — Julij 2025 (Faza 1-5)

### Varnost (Faza 1+3+4)
- proxy.ts — centralni auth middleware z DB PIN validacijo
- scrypt PIN hashing z backward-compat
- Redis-backed rate limiting (login, loyalty, FURS INI, Stripe)
- Loyalty JWT (HS256, 30-dnevni TTL)
- CSRF protection (Origin header check)
- Webhook tenant routing brez unsafe fallback
- fursCertPassword encryption (AES-256-GCM)
- Super-admin key za POST /api/restaurants
- 8 IDOR popravkov (orders/export, operators/[id], pay, qr, customers, gift-cards, itd.)

### FURS skladnost (Faza 1+2)
- InvoiceIssuer parameterization (per-tenant, ne hardcoded)
- xml-crypto SignedXml z exc-c14n canonicalization
- node-forge .p12 certifikat loading
- Storno sendInvoiceToFurs (ne generateEOR bypass)
- $transaction v pay + storno + Stripe webhook
- AuditLog model + integracija v pay/storno/INI + audit-log API
- AuditLogView admin komponenta

### Data integrity (Faza 2)
- 16 Float -> Decimal monetarnih polj
- 6 Prisma enumov (OrderStatus, PaymentMethod, itd.)
- 29 @@index direktiv
- Prisma migrations baseline

### Infrastructure (Faza 3+4)
- Kitchen service: Redis adapter + socket.io auth + /health endpoint
- Sentry error tracking (client + server + edge + captureException v 5 rutah)
- CORS + security headers v next.config.ts
- Production docker-compose (Postgres + Redis + Kitchen + POS)
- Caddyfile.prod z TLS + security headers
- Dockerfile popravljen za PostgreSQL

### Testing & Docs (Faza 1+4+5)
- 20 unit testov (auth, FURS, proxy, JWT)
- 15 e2e testov (auth, order flow, IDOR, audit log)
- OpenAPI 3.1 spec (33 pathov) + Swagger UI na /api-docs
- DEPLOYMENT.md (700-vrsticni vodič)
- ARCHITECTURE.md (diagram komponent)
- CI/CD 5-job pipeline z security scan
- 7 phantom deps odstranjenih
- ESLint rules re-enabled

### PWA (Faza 3)
- Offline queue za POST/PUT/DELETE (Background Sync + IndexedDB)
- useOfflineQueue hook

 — Gostilna POS

Vse pomembne spremembe tega projekta bodo zapisane v tem dokumentu.

Format temelji na [Keep a Changelog](https://keepachangelog.com/si/1.1.0/),
in projekt uporablja [Semantic Versioning](https://semver.org/lang/sl/).

---

## [Nepublikovano] — Julij 2025 (74+ funkcij, profesionalna izboljšava)

### Dodano — UX izboljšave (6 funkcij)
- **Offline indikator** — pravi online/offline badge v headerju (rdeč WifiOff ko ni povezave)
- **Sidebar collapsed/expand mode** — gumb za skrčenje na ikone (w-16), več prostora za vsebino
- **Daily target progress bar** — pametni cilj prometa v Dashboard (1.500€ delavnik / 2.500€ vikend, flame pri 80%, trophy ob dosegu)
- **Multi-currency prikaz** — EUR/HRK/USD za turiste z CurrencyToggle v headerju (računi vedno v EUR za FURS)
- **Order timer/stopwatch** — v TablesView z urgency barvami (normal/warning/urgent po 45/90 min)
- **VIP nagrade** — 4 milestone-i (500/1000/2000/5000€) z bonus točkami v CRM analitiki

### Dodano — Real-time operacije (5 funkcij)
- **Sound/avdio feedback** — Web Audio API sistem (5 zvokov: success/info/warning/kitchen/error) z SoundToggle
- **Quick stats widget** — 2. vrstica v TablesView (povprečni čas mize, postavk v teku, dolge mize, zasedenost)
- **Activity feed** — real-time timeline v Dashboard (plačila, naročila, rezervacije, napitnine), auto-refresh 30s
- **Table turn time analitika** — povprečno trajanje mize po dnevih, dnevih v tednu, sekcijah
- **Quick re-order** — ponovno naročilo zadnjega računa stranke z enim klikom

### Dodano — Varnost in kvaliteta (5 funkcij)
- **Allergen filter** — 14 EU alergenov z ikonami v OrderView (skrije jedi z izbranimi alergeni za varnost gostov)
- **KitchenDisplay prep timer** — 3-stopinjska urgensa (normal/warning/urgent) + progress bar + ZAMUDA badge
- **Customer feedback sistem** — ocene jedi/strežbe/ambienta z distribucijo, trendom, tag analitiko, odgovori
- **Live server status** — aktivni natakarji z odprtimi mizami, današnjo prodajo in urgency barvami v Dashboard
- **Out-of-stock alert banner** — prikaze se na vrhu POS ko so artikli prazni, warning zvok, razširljiv seznam

### Tehnične izboljšave
- **Prisma**: dodan Feedback model (foodRating, serviceRating, ambienceRating, overallRating, comment, tags, response)
- **Novi APIji**: /api/activity-feed, /api/tables/turn-time, /api/customers/[id]/last-order, /api/customers/[id]/vip-bonus, /api/feedback, /api/feedback/[id], /api/operators/live-status, /api/inventory/out-of-stock
- **Novi hook-i**: useOnlineStatus, useNow (formatElapsed, getUrgencyLevel), useSoundFeedback
- **Nove lib datoteke**: multi-currency.ts, allergens.ts
- **116 API rute** (+7 od prej)
- **49 POS komponent** (+8 od prej)
- **20 Prisma modelov** (+1 Feedback)

---

## [Nepublikovano] — December 2025 (52+ funkcij, 100% AI slike)

### Dodano — Finalne izboljšave
- **Backup API** (JSON izvoz vseh podatkov) + UI v Settings
- **Daily Report** — dnevno poročilo na email (prihodek, računi, napitnine, top izdelki, low-stock, urna statistika)
- **Notification Center** — bell ikona z števcem (low-stock, odprta naročila, rezervacije, smena)
- **Globalni search** (Ctrl+K) — 26 funkcij, grupirano po kategorijah, ↑↓ navigacija
- **Keyboard shortcuts help** (?) — overlay z vsemi bližnjicami
- **Delete AI slik** v ImageManager (Trash2 gumb v hover overlay)
- **Dark mode v Kiosku** — Sun/Moon toggle z localStorage
- **Hitri "Nov račun" gumb** na Mize view (najde prvo prosto mizo)
- **Ctrl+K hint** v PosHeader (⌘K badge)
- **5 KPI na Računi** view (št. računov, prihodek, povp. račun, napitnine, storno)
- **Prihodek danes** badge na Mize view
- **Hitri preklop** priljubljene/dnevna ponudba v meni seznamu (⭐ in DANA gumb)
- **Auto-apply Happy Hour** v POS OrderView (prečrtana cena + popust + -% badge)
- **Happy Hour banner** v OrderView (ime, ura, popust, št. postavk)
- **Allergen-check API** — preveri alergene stranke ob izbiri jedi
- **Angleški prevodi** za vseh 34 meni postavk (100%)
- **Reorder email** — pošlji naročilo dobavitelju na email
- **Email račun** — pošlji račun na email po plačilu
- **Integrations panel** v Settings (6 integracij s statusom)
- **Low-stock banner** na Dashboard (klik = Zaloga)
- **Tiskanje računa** na kiosku + sledenje naročilu
- **Reorder report** — pametni predlog naročil z kontakti dobaviteljev
- **Bulk restock** — hitri vnos zalog za 371 artiklov
- **Katalog 361 evropskih živil** z 16 kategorijami
- **Uvoz dobavnic** (ročno + CSV paste)
- **Food Waste Tracking** — 6 razlogov, dnevni trend, top odpadki
- **AI Demand Forecasting** — napoved povpraševanja + priporočilo osebja
- **Link-images API** — poveže slike na disku z meni postavkami
- **Translate-all API** — posodobi angleške prevode za vse postavke
- **Order Ahead** v Loyalty — mobile naročanje pred prihodom (Starbucks style)
  - Pickup time, dinein/takeaway, loyalty točke avtomatsko
- **Upsell AI Engine** — "Ali želite pijačo?" v Kiosk in Online Meni
  - Market basket analysis, confidence scoring
- **Push notifikacije** (PWA) — VAPID, toggle v Loyalty Home
- **Gamification** — 12 badge-ov + 3 izzivi z progress bar
- **Predplačilna kartica** (Wallet) — polnitev, transakcije, zgodovina

### Dodano — Faza 3 (napredno)
- **Self-Service Kiosk** (`/kiosk`) — celozaslonski z AI slikami in upsell
- **AI Demand Forecasting** — napoved povpraševanja + priporočilo osebja
- **Customer Display Unit** (`/cdu`) — drugi zaslon za gosta (BroadcastChannel sync)
- **Apple Pay / Google Pay** (Stripe Terminal) — 5. način plačila
- **Combo Meals** — set meniji z izbiro pod-itemov in fiksno ceno
- **Računovodstvo** — 4 formati izvoza (CSV, Pantheon, QuickBooks, XML/eDavki)
- **Loyalty App** (`/zvestoba`) — 5 tabov, 4 level-i, 8 nagrad, QR kartica
- **Deliverect** — agregator 8 dostavnih platform (UberEats, DoorDash, Glovo, Bolt, itd.)
- **OpenTable/Resy** — sinhronizacija rezervacij z avtomatskim iskanjem mize

### Dodano — Faza 2 (srednje)
- **Happy Hour** — časovno odvisne cene z avtomatskimi popusti
- **Multi-Step KDS Routing** — 4 postaje (Vroča, Hladna, Pijača, Sladice)
- **Wolt integracija** — webhook, avtomatska kreacija naročil

### Dodano — Faza 1 (hitri dosežki)
- **Menu Engineering** — Bostonska matrika (Zvezde/Konji/Uganke/Psi)
- **Tip Pooling** — 3 metode distribucije napitnin (hours, role, hybrid)
- **Multi-Location Benchmark** — primerjava med restavracijami
- **Food Waste Tracking** — 6 razlogov, dnevni trend, avto-odštevanje

### Dodano — Multi-tenant + FURS + Sumup
- **Multi-tenant SaaS** — več restavracij v eni instalaciji
- **FURS produkcija** — resničen SOAP klic z WS-Security in mutual TLS
- **Sumup terminal** — real-time polling, preklic
- **Tableside Ordering** (`/natakar`) — mobilna aplikacija za natakarje
- **Employee Scheduling** — Clock In/Out, Labor Cost %
- **Email/SMS notifikacije** — rezervacije, online naročila
- Prikaz napitnin v dashboardu (dnevne napitnine)
- Prikaz napitnin v zaključku smene (skupne napitnine)
- Prisma: `tip Float @default(0)` na `Order`
- API `/api/orders/[id]/pay` sprejema `tip`, vrača `grandTotal`
- API `/api/stats` vrača `todayTips`
- API `/api/shifts/live-stats` vrača `tips`
- API `/api/shifts/[id]/close` vrača `totalTips`

---

## [0.2.0] — 2024-12 (POS za prodajo)

### Dodano — Temeljne funkcije
- **FURS fiskalizacija** (POC): ZOI (RSA-SHA256+MD5), EOR (UUID), XML račun, QR koda
- **Storno računov** s povezavo na izvirnik (stornoOf, stornoZoi, stornoEor)
- **Z-report** — dnevni zaključek blagajne
- **SRS številčenje** računov (zaporedne številke)
- **PIN login** z backend avtentikacijo (Operator model, vloge cashier/admin)
- **3 načini plačila**: gotovina, kartica, **darilna kartica**
- **Mize** (Dvorana/Terasa/Zasebna) z barvnimi statusi
- **Modifierji** (brez čebule, dobro pečena, brez glutena) s spremembo cene
- **Void postavk** (ponižanje z razlogom)
- **Popusti** (% ali fiksni EUR) na nivoju računa
- **Ponovi zadnje naročilo** (hitri gumb)
- **Prestavi mizo** (prenos naročila)
- **Split bill** (delitev računa)

### Dodano — Online naročanje (gostje)
- Javni meni `/meni` dostopen preko QR kode
- Sledenje naročila v živo `/sledi/[id]` (polling 5s)
- Alergeni po EU 1169/2011 (13 alergenov z ikonami)
- Hranilna vrednost (kalorije, makrohranila)
- Dvojezičnost SI/EN (gost preklopi jezik)
- Takeaway možnost (poberi sam)
- PDF izvoz računa `/print/receipt/[id]`

### Dodano — Kuhinja (real-time)
- WebSocket server (mini-service, port 3003, socket.io)
- Kitchen Display System (KDS) z avto-osvežitvijo
- Statusi: novo → v pripravi → pripravljeno → servirano

### Dodano — Inventory & Recipe Costing
- Inventory CRUD (kos, kg, l, g, ml) z minimalnimi količinami
- Low-stock alerti
- Recipe Manager — povezava meni postavke z inventarjem
- Auto-deduct ob plačilu
- Food Cost Analiza (food cost % per jed)
- Restock gumb

### Dodano — CRM / Loyalty
- Baza strank (ime, telefon, email, opombe, alergije)
- Točke zvestobe (1 točka / 10 €)
- Skupna poraba in število obiskov
- Povezava z računi (zgodovina)

### Dodano — Darilne kartice
- 8-mestne kode (`GC-XXXXXXXX`)
- Poljuben začetni znesek
- Redeem pri plačilu (3. način plačila)
- Status: active/used/expired

### Dodano — Poročila & Dashboard
- Dashboard v živo (dnevni promet, št. računov, povprečni račun)
- Urni graf prometa
- Top izdelki po prodaji
- Načini plačila
- Tedenska statistika (7-dnevni trend)
- Mesečna poročila (CSV export računov)
- Rezervacije miz (koledar)

### Dodano — UX/UI
- Dark mode (next-themes)
- Dvojezičnost SI/EN
- Tipkovne bližnjice (1–5 za preklop med pogledi, Esc za nazaj)
- PWA (service worker, manifest.json, offline delo)
- Mobilno responsive (touch-friendly, min 44px tarče)
- Sticky footer (vedno na dnu)

### Tehnično
- **Next.js 16** (App Router, Turbopack)
- **TypeScript 5** strict
- **Tailwind CSS 4** + **shadcn/ui** (New York)
- **Prisma ORM** + SQLite (11 modelov)
- **Zustand** (client) + **TanStack Query** (server)
- **socket.io** (mini-service na portu 3003)
- **sonner** za toast obvestila
- **qrcode** za QR kode
- **lucide-react** za ikone
- **framer-motion** za animacije
- 34 menijskih postavk v seed (predjedi, glavne jedi, sladice, pijače)
- 14 miz (Dvorana/Terasa/Zasebna)
- 20 inventory items, 10 receptov, 5 strank, 3 operaterji
- Demo računi, rezervacije, smene

---

## [0.1.0] — 2024-11 (initial)

### Dodano
- Kloniran ICEPOS iz Gitee (gotoitcn/icepos + xmosnewone/icepos_manage)
- Push mirror na GitHub `markec12345678/ICEPOS`
- Osnovna Prisma schema (MenuItem, Table, Order, OrderItem)
- Backend API: `/api/menu`, `/api/tables`, `/api/orders`, `/api/orders/[id]/pay`
- Frontend komponente: PosHeader, PosSidebar, TablesView, OrderView, PaymentDialog, DashboardView
- Zustand store
- Custom useFetch hook
- Demo podatki (14 miz, 34 postavk)
- EUR format (sl-SI), slovenski meni

---

[Unreleased]: https://github.com/markec12345678/ICEPOS/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/markec12345678/ICEPOS/releases/tag/v0.2.0
[0.1.0]: https://github.com/markec12345678/ICEPOS/releases/tag/v0.1.0
