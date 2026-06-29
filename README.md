# 🍽️ Gostilna POS — Slovenska restavracijska blagajna

> Popolna slovenska restavracijska blagajna (POS) z **FURS skladnostjo**, online naročanjem preko QR kode, upravljanjem zalog, CRM/zvestobo in darilnimi karticami.
> Zgrajena na **Next.js 16 + TypeScript + Prisma + Tailwind/shadcn**. Pripravljena za prodajo lokalnim restavracijam in hotelom.

---

## ✨ Ključne funkcije

### 🧾 Blagajna & FURS
- **Fiskalizacija računov** (ZOI: RSA-SHA256 + MD5, EOR: UUID, podpisan XML, QR koda)
- **Dvojna DDV stopnja** (9,5 % znižana za hrano, 22 % splošna za alkohol)
- **Storno računov** s sledljivostjo (povezava z izvirnikom)
- **Z-report** (dnevni zaključek blagajne)
- **SRS številčenje** računov (zaporedne številke)
- **PIN login** z backend avtentikacijo (Operator model, vloge `cashier` / `admin`)
- **Mene** plačil: gotovina, kartica, **darilna kartica**

### 🍽️ Naročanje
- **Mize** (Dvorana / Terasa / Zasebna) z barvno kodiranimi statusi
- **Modifierji** (brez čebule, dobro pečena, brez glutena …) s spremembo cene
- **Void postavk** (ponižanje računa z razlogom)
- **Popusti** (% ali fiksni EUR) na nivoju računa
- **Ponovi zadnje naročilo** (hitri gumb)
- **Prestavi mizo** (prenos naročila na drugo mizo)
- **Split bill** (delitev računa med več oseb)
- **Napitnine** (% ali fiksni EUR) — prikaz v plačilnem dialogu, dashboardu in zaključku smene

### 📱 Online naročanje (gostje)
- **Javni meni** (`/meni`) dostopen preko QR kode na mizi
- **Sledenje naročila** v živo (`/sledi/[id]`) — status: prejeto → v pripravi → pripravljeno → servirano
- **Alergeni** po EU 1169/2011 (13 alergenov z ikonami)
- **Hranilna vrednost** (kalorije, makrohranila)
- **Dvojezičnost** SI / EN (gost lahko preklopi jezik)
- **Takeaway** možnost (poberi sam)
- **PDF izvoz računa** (`/print/receipt/[id]`)

### 🍳 Kuhinja (real-time)
- **WebSocket** povezava (socket.io, mini-service na portu 3003)
- **Kitchen Display System (KDS)** — nova naročila prihajajo v živo
- **Statusi**: novo → v pripravi → pripravljeno → servirano
- **Avto-osvežitev** brez potrebe po osveževanju strani

### 📦 Inventory & Recipe Costing
- **Inventory CRUD** (mesto, kg, l, g, ml) z minimalnimi količinami
- **Low-stock alerti** (samodejno opozarilo ko pade pod mejo)
- **Recipe Manager** — poveži meni postavko z inventarjem (npr. Pizza → 200g moke, 100g sira)
- **Auto-deduct** — ob plačilu se zaloga samodejno odšteje
- **Food Cost Analiza** — food cost % per jed (cena sestavin / prodajna cena)
- **Restock** gumb za hitro dopolnjevanje

### 👥 CRM / Loyalty
- **Baza strank** (ime, telefon, email, opombe, alergije)
- **Točke zvestobe** (1 točka / 10 € porabe)
- **Skupna poraba** in število obiskov
- **Povezava z računi** (zgodovina nakupov)

### 🎁 Darilne kartice
- **8-mestne kode** (npr. `GC-AB12CD34`)
- **Poljuben začetni znesek**
- **Redeem** pri plačilu (3. način plačila)
- **Status**: active / used / expired

### 📊 Poročila & Dashboard
- **Dashboard** v živo (dnevni promet, št. računov, povprečni račun, napitnine)
- **Urni graf** prometa
- **Top izdelki** po prodaji
- **Načini plačila** (gotovina / kartica / darilna kartica)
- **Tedenska statistika** (7-dnevni trend)
- **Mesečna poročila** (CSV export računov)
- **Rezervacije** miz (koledar)

### 🎨 UX/UI
- **Dark mode** (next-themes)
- **Dvojezičnost** SI/EN
- **Tipkovne bližnjice** (1–5 za preklop med pogledi, Esc za nazaj)
- **PWA** (service worker, manifest.json — delo tudi offline)
- **Mobilno responsive** (touch-friendly, min 44px tarče)
- **Sticky footer** (vedno na dnu, tudi na kratkih straneh)

---

## 🛠️ Tehnološki sklad

| plast | tehnologija |
|------|-------------|
| Framework | **Next.js 16** (App Router, Turbopack) |
| Jezik | **TypeScript 5** |
| Styling | **Tailwind CSS 4** + **shadcn/ui** (New York) |
| ORM | **Prisma** + SQLite |
| State | **Zustand** (client) + **TanStack Query** (server) |
| Real-time | **socket.io** (mini-service, port 3003) |
| Fiskalizacija | **crypto** (RSA-SHA256, MD5) + **qrcode** |
| Avtentikacija | **NextAuth.js v4** (PIN login) |
| PWA | service worker + manifest.json |
| Ikone | **lucide-react** |
| Toasti | **sonner** |

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
