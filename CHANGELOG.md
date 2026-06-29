# Changelog — Gostilna POS

Vse pomembne spremembe tega projekta bodo zapisane v tem dokumentu.

Format temelji na [Keep a Changelog](https://keepachangelog.com/si/1.1.0/),
in projekt uporablja [Semantic Versioning](https://semver.org/lang/sl/).

---

## [Nepublikovano]

### Dodano — Izpopolnitev (Toast POS konkurenca)
- **Tableside Ordering** (`/natakar`) — mobilna aplikacija za natakarje
  - PIN login z localStorage persistenco
  - Bottom navigation: Mize | Meni | Naročila
  - Mize z avto-osvežitvami (10s polling), prikaz postavk/zneska za zasedene
  - Meni z iskanjem, kategorijami, item modal (količina, opomba)
  - Cart drawer + "Pošlji v kuhinjo" (POST /api/orders + send-to-kitchen)
  - Moja naročila z avto-osvežitvami (5s)
- **Email/SMS notifikacije** (`lib/notifications.ts`)
  - Predloge: rezervacije, online naročila, "naročilo pripravljeno"
  - Integrirano v `/api/reservations` (SMS ob potrditvi)
  - Integrirano v `/api/orders/guest` (email ob online naročilu)
  - Pripravljeno za SMTP/Twilio v produkciji
- **Employee Scheduling + Labor Cost**
  - Prisma: `Schedule` (unique [operatorId, date]) + `Timesheet` modela
  - Operator: `hourlyRate Float @default(12)` za labor cost izračun
  - API: `/api/schedules` (CRUD z week filter), `/api/timesheets` (CRUD + clock)
  - API: `/api/timesheets/clock` (hitri in/out), `/api/labor-cost` (analiza)
  - Komponenta `scheduling-view.tsx` z 3 zavihki:
    - **Tedenski razpored** — grid operaterji × 7 dni, modal za dodajanje shifts
    - **Clock In/Out** — hitri gumbi per operater, dnevnik ur
    - **Labor Cost** — KPI (strošek dela, promet, labor %, ure), per-operator breakdown
  - Idealni labor cost %: 25–30% (v restavracijah)
  - Nov "Razpored" gumb v sidebar (desktop) in "Več" menu (mobile)

### Dodano
- **Napitnine (Tips)** — UI v plačilnem dialogu (%, fiksni EUR, hitri gumbi 5/10/15 %, 1/2/5 €)
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
