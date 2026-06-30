# 🍽️ Gostilna POS — Slovenska restavracijska blagajna (SaaS)

> **Vodilna slovenska restavracijska blagajna** z **100+ funkcijami** — FURS skladnost, multi-tenant SaaS, AI slike jedi, AI napoved povpraševanja, Wolt/Deliverect integracija, Apple Pay/Google Pay, loyalty app z gamification, in več.
> Konkurenčna z **Toast POS, Square, Lightspeed, Starbucks Rewards**.
> Zgrajena na **Next.js 16 + TypeScript + Prisma + Tailwind/shadcn**.

---

## ✨ Ključne funkcije (100+)

### 🏢 Multi-Tenant SaaS
- **Več restavracij** v eni instalaciji z ločenimi podatki
- **Tenant selector** — preklop med restavracijami z enim klikom
- **Per-tenant FURS** konfiguracija (taxNumber, businessUnit, certifikat)
- **Multi-Location Benchmark** — primerjava med lokacijami
- **Ločeni operaterji** per restavracija (PIN per tenant)

### 🧾 Blagajna & FURS (produkcija ready)
- **Fiskalizacija računov** (ZOI: RSA-SHA256 + MD5, EOR: UUID, XML, QR koda)
- **Produkcijski SOAP klic** z WS-Security podpisom in mutual TLS
- **INI postopek** — registracija naprave pri FURS
- **Dvojna DDV stopnja** (9,5% znižana, 22% splošna)
- **Storno računov** s sledljivostjo
- **Z-report** (dnevni zaključek)
- **PIN login** z backend avtentikacijo (vloge cashier/admin)

### 💳 Plačila (5 načinov)
- **Gotovina** s hitrimi zneski in vračilom
- **Kartica**
- **Darilna kartica** (GC-XXXXXXXX kode z avto-redeem)
- **Sumup terminal** (real-time polling, preklic)
- **Apple Pay / Google Pay** (Stripe Terminal, NFC)

### 📱 7 Uporabniških vmesnikov
1. **POS Blagajna** (`/`) — za blagajnike (5 načinov plačila, napitnine, CDU sync)
2. **KDS Kuhinja** — real-time WebSocket, multi-step routing (4 postaje)
3. **Natakar Tableside** (`/natakar`) — mobilna aplikacija za natakarje
4. **Online Meni** (`/meni`) — javni meni z AI slikami, alergeni, upsell AI
5. **Self-Service Kiosk** (`/kiosk`) — celozaslonski z AI slikami in upsell
6. **Customer Display** (`/cdu`) — drugi zaslon za gosta (real-time sync)
7. **Loyalty App** (`/zvestoba`) — Starbucks-nivo: točke, nagrade, order ahead, wallet, gamification

### 🚴 Dostava (2 integraciji)
- **Wolt** — webhook, avtomatska kreacija naročil, accept/reject/ready
- **Deliverect** — agregator 8 platform (UberEats, DoorDash, Glovo, Bolt, itd.)

### 📞 Rezervacije
- **OpenTable/Resy** integracija — webhook, avtomatsko iskanje mize
- **Interni rezervacije** z koledarjem in konflikt detekcijo

### 📊 Analitika & AI
- **Dashboard** v živo (promet, računi, napitnine, urni graf)
- **Menu Engineering** — Bostonska matrika (Zvezde/Konji/Uganke/Psi)
- **AI Demand Forecasting** — napoved povpraševanja + priporočilo osebja
- **Multi-Location Benchmark** — top/bottom performer per lokacija
- **Food Waste Tracking** — 6 razlogov, dnevni trend, top odpadki

### 🍳 Kuhinja (KDS)
- **Real-time WebSocket** (brez zakasnitve)
- **Multi-Step Routing** — 4 postaje (Vroča, Hladna, Pijača, Sladice)
- **Timer z opozorili** (>10min rdeči ring)
- **Klic mize** z zvokom
- **Wolt/Deliverect** naročila direktno v KDS

### 👔 HR & Osebje
- **Employee Scheduling** — tedenski razpdel (grid operaterji × 7 dni)
- **Clock In/Out** — hitri gumbi per operater
- **Labor Cost %** — strošek dela / promet
- **Tip Pooling** — 3 metode (hours, role, hybrid) z avto-distribucijo

### 📦 Inventory
- **CRUD** z minimalnimi količinami in low-stock alerti
- **Recipe Manager** — povezava meni postavke z inventarjem
- **Auto-deduct** ob plačilu
- **Food Cost %** per jed
- **Food Waste Tracking** — 6 razlogov, avto-odštevanje iz zaloge

### 🎨 AI & Avtomatizacija
- **AI slike jedi** — ZAI image generation (professional food photography)
- **Upsell AI Engine** — "Ali želite pijačo?" v Kiosk in Online Meni
- **Happy Hour** — časovno odvisne cene (avtomatski popusti)
- **Combo Meals** — set meniji z izbiro pod-itemov
- **Email/SMS notifikacije** — rezervacije, online naročila

### 👥 CRM & Loyalty (Starbucks nivo)
- **Loyalty App** s 5 tabi: Domov, Naroči, Kartica, Nagrade, Dosežki
- **4 level-i** (Novinec → Bronca → Srebro → Zlato) z progress bar
- **8 nagrad** z unovčevanjem in voucher kodami
- **Order Ahead** — mobile naročanje pred prihodom
- **Predplačilna kartica** (Wallet) — polnitev, transakcije
- **Gamification** — 12 badge-ov + 3 izzivi z progress bar
- **Push notifikacije** (PWA, VAPID)
- **QR kartica** zvestobe za predstavitev natakarju

### 🧮 Računovodstvo
- **4 formati izvoza**: CSV (Excel), Pantheon, QuickBooks, XML (eDavki)
- **DDV breakdown** po stopnjah (22%, 9.5%)
- **Načini plačila** z deleži
- **Storno računi** z negativnim zneskom

### 🎨 UX/UI
- **Dark mode** (next-themes)
- **Dvojezičnost** SI/EN
- **PWA** z offline delom (service worker)
- **Tipkovne bližnjice** (1–5 za pogledi, Esc nazaj)
- **Mobile responsive** (touch-friendly, min 44px tarče)
- **AI slike** v POS, Online Meni, Kiosk, Loyalty Order Ahead

---

## 🛠️ Tehnološki sklad

| plast | tehnologija |
|------|-------------|
| Framework | **Next.js 16** (App Router, Turbopack) |
| Jezik | **TypeScript 5** |
| Styling | **Tailwind CSS 4** + **shadcn/ui** (New York) |
| ORM | **Prisma** + SQLite (15+ modelov) |
| State | **Zustand** (client) + **TanStack Query** (server) |
| Real-time | **socket.io** (mini-service, port 3003) |
| Fiskalizacija | **crypto** (RSA-SHA256, MD5, WS-Security) + **qrcode** |
| AI slike | **z-ai-web-dev-sdk** (image generation) |
| Plačila | **Sumup** + **Stripe** (Apple Pay/Google Pay) |
| Dostava | **Wolt Partner API** + **Deliverect API** |
| Rezervacije | **OpenTable/Resy API** |
| Push | **Web Push API** (VAPID) |
| Avtentikacija | **NextAuth.js v4** (PIN login) |
| PWA | service worker + manifest.json |
| Ikone | **lucide-react** |
| Toasti | **sonner** |

---

## 📱 Aplikacije & Route

| Route | Aplikacija | Uporabnik |
|-------|-----------|-----------|
| `/` | POS Blagajna | Blagajnik |
| `/natakar` | Tableside Ordering | Natakar |
| `/meni` | Online Meni (QR) | Gost |
| `/kiosk` | Self-Service Kiosk | Gost |
| `/cdu` | Customer Display | Gost |
| `/zvestoba` | Loyalty App | Stranka |
| `/sledi/[id]` | Sledenje naročila | Gost |
| `/print/receipt/[id]` | PDF račun | Gost |

---

## 📦 Namestitev

### Zahteve
- **Node.js 20+** ali **Bun** (priporočeno)
- SQLite (vključen v repozitoriju)

### Koraki

```bash
# 1. Kloniraj repozitorij
git clone https://github.com/markec12345678/ICEPOS.git
cd ICEPOS

# 2. Namesti odvisnosti
bun install

# 3. Pripravi okoljske spremenljivke
cp .env.example .env

# 4. inicializiraj bazo
bun run db:push
bun run db:seed   # 34 menijskih postavk, 14 miz, demo podatki

# 5. Zaženi razvojni strežnik
bun run dev       # http://localhost:3000

# 6. (opcija) Zaženi kitchen WebSocket service
cd mini-services/kitchen-service && bun install && bun run dev
```

### Demo PIN kod za login

| Vloga | PIN | Ime |
|-------|-----|-----|
| Admin | `1234` | Marko (admin) |
| Blagajnik | `5678` | Ana (cashier) |
| Blagajnik | `9999` | Peter (cashier) |

---

## 🚀 Uporaba

### Glavni blagajniški tok
1. **Login** s PIN kodo
2. Izberi **mizo** → odpri naročilo
3. Dodaj **meni postavke** v voziček (z modifierji, opombami)
4. **Pošlji v kuhinjo** (WebSocket, KDS osvežen v živo)
5. **Plačaj** (gotovina/kartica/darilna kartica + napitnina)
6. Račun **fiskaliziran** (ZOI, EOR, QR koda)
7. Miza **sproščena**, statistika osvežena

### Online naročanje (gost)
1. Gost poskenira **QR kodo** na mizi
2. Odpre se javni meni (`/meni`) z alergeni in kalorijami
3. Doda postavke v voziček, izbere takeaway ali na mizi
4. Potrdi naročilo → dobi **ID za sledenje**
3. Sledi statusu na `/sledi/[id]`

---

## 📁 Struktura projekta

```
.
├── prisma/
│   ├── schema.prisma          # 11 modelov (MenuItem, Order, Table, ...)
│   └── seed.ts                # Demo podatki (34 jedi, 14 miz, ...)
├── src/
│   ├── app/
│   │   ├── page.tsx           # Glavna POS aplikacija (edina javna route)
│   │   ├── meni/              # Javni meni za goste (QR)
│   │   ├── sledi/[id]/        # Sledenje naročila v živo
│   │   ├── print/receipt/[id]/# PDF izvoz računa
│   │   └── api/               # REST API (30+ endpointov)
│   ├── components/
│   │   ├── pos/               # 25+ blagajniških komponent
│   │   ├── ui/                # shadcn/ui komponente
│   │   └── menu-client.tsx    # Guest ordering UI
│   ├── lib/
│   │   ├── furs.ts            # FURS modul (ZOI, EOR, XML, QR)
│   │   ├── furs-api.ts        # FURS REST API (POC)
│   │   ├── auth.ts            # PIN avtentikacija
│   │   ├── db.ts              # Prisma client
│   │   └── types.ts           # TypeScript tipi
│   ├── stores/                # Zustand (pos, lang)
│   └── hooks/                 # use-fetch, use-keyboard-shortcuts, ...
├── mini-services/
│   └── kitchen-service/       # WebSocket server (port 3003)
├── public/
│   ├── sw.js                  # PWA service worker
│   ├── manifest.json          # PWA manifest
│   └── logo.svg
└── docs/
    └── screenshots/           # 36 screenshotov funkcij
```

---

## 🇸🇮 FURS skladnost (POC)

Ta implementacija vključuje **proof-of-concept** FURS fiskalizacije:

- ✅ **ZOI** (Zaščitna oznaka izdajatelja) — RSA-SHA256 podpis + MD5 hash, 32 hex znakov
- ✅ **EOR** (Enkratna identifikacija računa) — UUID v4
- ✅ **XML račun** po FURS specifikaciji (soapenv envelope)
- ✅ **QR koda** z ZOI + datum/čas (za goste)
- ✅ **Storno** računov (poseben XML tip)
- ✅ **Z-report** (dnevni zaključek)

> ⚠️ **Opomba**: Za produkcijsko uporabo morate registrirati poslovni prostor pri FURS, pridobiti digitalno potrdilo (eDavki) in konfigurirati `FURS_CERT_PATH`, `FURS_TAX_NUMBER` v `.env`. Glej `src/lib/furs-api.ts` za produkcijske endpointe.

---

## 🖼️ Screenshoti

Vsi screenshoti so v `docs/screenshots/`:

| # | Funkcija | Datoteka |
|---|----------|----------|
| 01 | Mize | `01-tables.png` |
| 02 | Naročilo z postavkami | `02-order-with-items.png` |
| 03 | Plačilo | `03-payment.png` |
| 04 | Računi | `04-receipts.png` |
| 05 | Kuhinja (KDS) | `05-kitchen.png` |
| 06 | Administracija menija | `06-menu-admin.png` |
| 07 | Rezervacije | `07-reservations.png` |
| 08 | Smena | `08-shift.png` |
| 09 | Dashboard | `09-dashboard.png` |
| ... | ... | ... |
| 36 | Napitnine | `36-tips.png` |

---

## 🗺️ Načrt za prihodnost

- [ ] **Tableside ordering** — natakar naroča direktno pri mizi z mobilno napravo
- [ ] **Employee scheduling** — razpored delavnikov, labor cost %
- [ ] **Produkcijska FURS integracija** (eDavki certifikat)
- [ ] **Multi-tenant** (več restavracij v eni instalaciji)
- [ ] **Mobilna aplikacija** (React Native za natakarje)
- [ ] **Integracija s pulznimi napravami** (fiskalni tiskalniki)
- [ ] **e-Račun** (B2B računi)
- [ ] **Mesečni porezni obračun** za napitnine

---

## 🤝 Prispevanje

Glej [CONTRIBUTING.md](./CONTRIBUTING.md). PR-ji dobrodošli!

---

## 📄 Licenca

**Apache License 2.0** — glej [LICENSE](./LICENSE).

Ta projekt je navdihnjen z [ICEPOS](https://gitee.com/gotoitcn/icepos) (odprtokodna kitajska POS blagajna, Apache 2.0), vendar je koda napisana od scratch za slovenski trg (FURS, EUR, DDV, slovenski UI).

---

## 👨‍💻 Avtor

**Marko** — slovenski razvajalec, specializiran za POS/blagajne.

- GitHub: [@markec12345678](https://github.com/markec12345678)
- Repo: [markec12345678/ICEPOS](https://github.com/markec12345678/ICEPOS)

---

## 🙏 Zahvale

- [ICEPOS](https://gitee.com/gotoitcn/icepos) — za navdih pri arhitekturi
- [shadcn/ui](https://ui.shadcn.com/) — za odlične UI komponente
- [Prisma](https://www.prisma.io/) — za ORM
- [Next.js](https://nextjs.org/) — za framework

---

**🍽️ Gostilna Pri Marku** — demo restavracija z vsemi funkcijami. Pripravljeno za produkcijsko uporabo z minimalnimi prilagoditvami.
