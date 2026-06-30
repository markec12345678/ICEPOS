# Changelog — Gostilna POS

Vse pomembne spremembe tega projekta bodo zapisane v tem dokumentu.

Format temelji na [Keep a Changelog](https://keepachangelog.com/si/1.1.0/),
in projekt uporablja [Semantic Versioning](https://semver.org/lang/sl/).

---

## [Nepublikovano] — December 2025 (100+ funkcij)

### Dodano — Priority 1, 2, 3 (UI analiza)
- **AI slike jedi** — ZAI image generation za meni postavke (professional food photography)
  - Integrirano v POS, Online Meni, Kiosk, Loyalty Order Ahead
  - ImageManager z batch generiranjem in ročnim upload
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
