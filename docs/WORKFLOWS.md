# 🔄 Gostilna POS — Workflow vodiči po vlogah

> Vizualni workflow diagrami za vsako uporabniško vlogo.
> Navdihnjeno po Toast POS, Square, in Lightspeed workflow dokumentaciji.

---

## 👨‍💼 Blagajnik — Dnevni workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  ZJUTRAJ                                                        │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ Prijava  │ →  │ Odpri    │ →  │ Preveri  │ →  │ Preveri  │  │
│  │ s PIN    │    │ smeno    │    │ zaloge   │    │ rezerv.  │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                       ↓         │
│  MED DELOM                                          ┌──────────┐│
│  ┌──────────┐    ┌──────────┐    ┌──────────┐     │ Pripravi ││
│  │ Izberi   │ →  │ Dodaj    │ →  │ Pošlji   │     │ mize za  ││
│  │ mizo     │    │ postavke │    │ v kuhinjo│     │ rezerv.  ││
│  └──────────┘    └──────────┘    └──────────┘     └──────────┘│
│       ↑               ↓                                         │
│       │          ┌──────────┐                                   │
│       │          │ Modifierji│                                  │
│       │          │ Opombe   │                                   │
│       │          └──────────┘                                   │
│       │               ↓                                         │
│  ┌────┴─────┐  ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ Naslednja│  │ Gost     │ →  │ Plačaj   │ →  │ FURS     │  │
│  │ miza     │  │ je jedel │    │ (got/kar)│    │ fiskal.  │  │
│  └──────────┘  └──────────┘    └──────────┘    └──────────┘  │
│                                     ↓               ↓         │
│                              ┌──────────┐    ┌──────────┐     │
│                              │ Napitnina│    │ Natisni  │     │
│                              │ Popust   │    │ račun    │     │
│                              │ Loyalty  │    └──────────┘     │
│                              └──────────┘                      │
│                                                                │
│  ZVEČER                                                        │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐│
│  │ Zaključi │ →  │ Z-report │ →  │ Izvozi   │ →  │ Odjava   ││
│  │ smeno    │    │          │    │ račune   │    │          ││
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 👨‍🍳 Kuhar — KDS workflow

```
┌─────────────────────────────────────────────────┐
│  KUHINJA DISPLAY SYSTEM (KDS)                   │
│                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │  NOVA   │  │  V      │  │  PRIPRA-│         │
│  │ (Nova)  │→ │ PRIPRVI │→ │ VLJENO  │         │
│  └─────────┘  └─────────┘  └─────────┘         │
│      ↓             ↓             ↓              │
│  Klik:         Klik:         Klik:              │
│  "Začni"      "Pripravljeno" "Pozovi mizo"     │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │  POSTAJE (Multi-Step Routing):          │    │
│  │  🍽️ Vse  🔥 Vroča  🥗 Hladna            │    │
│  │  🍹 Pijača  🍰 Sladice                   │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │  TIMERJI:                               │    │
│  │  < 10 min: normalno                     │    │
│  │  > 10 min: 🔴 rdeči ring                │    │
│  │  Priority: ⚡ PREDNOST badge             │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  Viri naročil:                                 │
│  → POS blagajna (dine-in)                      │
│  → Natakar (tableside)                          │
│  → Online meni (QR)                             │
│  → Wolt dostava                                 │
│  → Deliverect (UberEats, DoorDash, itd.)       │
│  → Kiosk                                        │
└─────────────────────────────────────────────────┘
```

---

## 🧑‍🍽️ Natakar — Tableside workflow

```
┌─────────────────────────────────────────────────┐
│  NATARAJ (mobilna aplikacija /natakar)          │
│                                                 │
│  ┌─────────┐                                    │
│  │ PIN     │ → Prijava                         │
│  │ login   │                                   │
│  └─────────┘                                    │
│      ↓                                          │
│  ┌─────────────────────────────────┐            │
│  │  BOTTOM NAVIGATION:             │            │
│  │  🏠 Mize │ 📋 Meni │ 📦 Naroč.│            │
│  └─────────────────────────────────┘            │
│                                                 │
│  MIZE TAB:                                      │
│  ┌─────────┐    ┌─────────┐                    │
│  │ Izberi  │ →  │ Odpri   │                    │
│  │ mizo    │    │ meni    │                    │
│  └─────────┘    └─────────┘                    │
│      ↓               ↓                          │
│                 ┌─────────┐                     │
│                 │ Dodaj   │                     │
│                 │ postavke│                     │
│                 │ + količ.│                     │
│                 │ + opomba│                     │
│                 └─────────┘                     │
│                     ↓                           │
│                 ┌─────────┐                     │
│                 │ Voziček │                     │
│                 │ pregled │                     │
│                 └─────────┘                     │
│                     ↓                           │
│                 ┌─────────────┐                 │
│                 │ "Pošlji v   │ → KDS se        │
│                 │  kuhinjo"   │   osveži       │
│                 └─────────────┘                 │
│                                                 │
│  NAROČILA TAB:                                  │
│  ┌─────────────────────────────────┐            │
│  │ Moja naročila (avto-refresh 5s)│            │
│  │ - Miza 2: 3 postavke, 37.10€  │            │
│  │ - Miza 5: 2 postavke, 18.50€  │            │
│  └─────────────────────────────────┘            │
└─────────────────────────────────────────────────┘
```

---

## 👤 Gost — Online naročanje workflow

```
┌─────────────────────────────────────────────────┐
│  GOST — Online naročanje (QR koda)              │
│                                                 │
│  ┌─────────┐                                    │
│  │ Skeniraj│ → /meni                           │
│  │ QR kodo │                                   │
│  └─────────┘                                    │
│      ↓                                          │
│  ┌─────────────────────────────────┐            │
│  │  BRSKANJE MENIJA                │            │
│  │  - 5 kategorij (predjedi, ...)  │            │
│  │  - AI slike jedi                │            │
│  │  - Alergeni EU (13)             │            │
│  │  - Kalorije, makrohranila       │            │
│  │  - SI/EN jezik                  │            │
│  │  - Upsell AI ("Še kaj piti?")   │            │
│  └─────────────────────────────────┘            │
│      ↓                                          │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐     │
│  │ Dodaj   │ →  │ Voziček │ →  │ Checkout│     │
│  │ v košar.│    │ pregled │    │         │     │
│  └─────────┘    └─────────┘    └─────────┘     │
│                                    ↓            │
│                    ┌──────────────────────┐     │
│                    │ Dine-in ali Takeaway?│     │
│                    └──────────────────────┘     │
│                              ↓                  │
│                    ┌──────────────────────┐     │
│                    │ Potrdi naročilo      │     │
│                    │ → ID za sledenje     │     │
│                    └──────────────────────┘     │
│                              ↓                  │
│                    ┌──────────────────────┐     │
│                    │ /sledi/[id]          │     │
│                    │ Status v živo:       │     │
│                    │ Prejeto → V pripravi │     │
│                    │ → Pripravljeno       │     │
│                    │ → Servirano          │     │
│                    └──────────────────────┘     │
└─────────────────────────────────────────────────┘
```

---

## 📱 Gost — Kiosk workflow

```
┌─────────────────────────────────────────────────┐
│  KIOSK (samopostrežba /kiosk)                   │
│                                                 │
│  ┌─────────┐                                    │
│  │ Brskaj  │ → 5 kategorij + iskanje           │
│  │ meni    │ → AI sike + cene                  │
│  └─────────┘                                    │
│      ↓                                          │
│  ┌─────────────────────────────────┐            │
│  │  UPSPELL AI:                    │            │
│  │  "Priporočamo še:"              │            │
│  │  🍰 Sladica po jedi? 3.90€     │            │
│  │  🥤 Še kaj za piti? 2.00€      │            │
│  └─────────────────────────────────┘            │
│      ↓                                          │
│  ┌─────────┐    ┌─────────┐                    │
│  │ Voziček │ →  │ Plačaj  │                    │
│  │ količine│    │         │                    │
│  └─────────┘    └─────────┘                    │
│                     ↓                          │
│              ┌───────────┐                     │
│              │ 💵 Gotov. │                     │
│              │ 💳 Kartica│                     │
│              └───────────┘                     │
│                     ↓                          │
│              ┌───────────┐                     │
│              │ FURS      │ → Račun fiskaliziran│
│              │ fiskaliz. │   (ZOI + EOR)      │
│              └───────────┘                     │
│                     ↓                          │
│              ┌───────────┐                     │
│              │ ✅ Hvala! │ → ID za sledenje    │
│              │           │ → Natisni račun     │
│              │           │ → Sledi naročilu    │
│              └───────────┘                     │
└─────────────────────────────────────────────────┘
```

---

## 🏆 Stranka — Loyalty App workflow

```
┌─────────────────────────────────────────────────┐
│  LOYALTY APP (/zvestoba)                        │
│                                                 │
│  ┌─────────┐                                    │
│  │ Login s │ → Telefonska številka              │
│  │ telef.  │                                   │
│  └─────────┘                                    │
│      ↓                                          │
│  ┌─────────────────────────────────┐            │
│  │  5 TABOV:                       │            │
│  │  ⭐ Domov                        │            │
│  │  🍽️ Naroči (Order Ahead)         │            │
│  │  💳 Kartica (Wallet)             │            │
│  │  🎁 Nagrade                      │            │
│  │  🏅 Dosežki (Gamification)       │            │
│  └─────────────────────────────────┘            │
│                                                 │
│  DOMOV:                                         │
│  → Točke (45) + Level (Novinec → Zlato)        │
│  → Progress bar do naslednjega levela           │
│  → QR karta zvestobe (pokaži natakarju)         │
│  → Push notifikacije toggle                     │
│  → Stats: poraba, obiski                        │
│                                                 │
│  NAROČI:                                        │
│  → Izberi jedi + čas prevzema                   │
│  → Dine-in ali Takeaway                         │
│  → +loyalty točke avtomatsko                    │
│  → Success screen z ID                          │
│                                                 │
│  KARTICA:                                       │
│  → Stanje predplačilne kartice                  │
│  → Naloži (10/20/50/100€)                      │
│  → Transakcije (polnitve + plačila)             │
│                                                 │
│  NAGRADE:                                       │
│  → 8 nagrad (kava, sladica, pivo, ...)         │
│  → Unovči → voucher koda                        │
│  → 4 level-i: Novinec/Bronca/Srebro/Zlato      │
│                                                 │
│  DOSEŽKI:                                       │
│  → 12 badge-ov (Dobrodošli, Pogost gost, ...)  │
│  → 3 izzivi (5 obiskov/mesec, 100€, 50 točk)   │
│  → Progress bar per izziv                       │
└─────────────────────────────────────────────────┘
```

---

## 📦 Manager — Inventory workflow

```
┌─────────────────────────────────────────────────┐
│  INVENTORY MANAGEMENT                           │
│                                                 │
│  1. UVOZ KATALOGA (361 artiklov)                │
│     ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│     │ Zaloga  │→ │ Uvozi   │→ │ Izberi  │      │
│     │         │  │ artikle │  │ kategor.│      │
│     └─────────┘  └─────────┘  └─────────┘      │
│                                    ↓            │
│                    ┌──────────────────────┐     │
│                    │ 16 kategorij:        │     │
│                    │ 🥩 Meso (36)         │     │
│                    │ 🐟 Ribe (15)         │     │
│                    │ 🥕 Zelenjava (45)    │     │
│                    │ 🍷 Alkohol (38)      │     │
│                    │ ... (361 skupaj)     │     │
│                    └──────────────────────┘     │
│                                 ↓               │
│                    ┌──────────────────────┐     │
│                    │ Uvozi vse ali izbrane│     │
│                    │ Stanje = 0           │     │
│                    └──────────────────────┘     │
│                                                 │
│  2. BULK ZALOGA (nastavi stanja)                │
│     ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│     │ Bulk    │→ │ Filtrir │→ │ Hitro   │      │
│     │ zaloga  │  │ (kat/0) │  │ nastavi │      │
│     └─────────┘  └─────────┘  └─────────┘      │
│                                    ↓            │
│                    ┌──────────────────────┐     │
│                    │ Gumbi: 0, 1, 5, 10, │     │
│                    │ 20, 50 za vse        │     │
│                    │ Ali posamezno vnos   │     │
│                    └──────────────────────┘     │
│                                 ↓               │
│                    ┌──────────────────────┐     │
│                    │ Shrani (N sprememb)  │     │
│                    └──────────────────────┘     │
│                                                 │
│  3. REORDER REPORT (pametno naročanje)          │
│     ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│     │ Naroči  │→ │ Pregled │→ │ Kontakt │      │
│     │         │  │ report  │  │ dobavit.│      │
│     └─────────┘  └─────────┘  └─────────┘      │
│                                    ↓            │
│                    ┌──────────────────────┐     │
│                    │ Grupirano po         │     │
│                    │ dobavitelju:         │     │
│                    │ Mercator: 151 art.   │     │
│                    │ Jata: 27 artiklov    │     │
│                    │ Local: 64 artiklov   │     │
│                    │ + kontakti (tel/email)│     │
│                    └──────────────────────┘     │
│                                 ↓               │
│                    ┌──────────────────────┐     │
│                    │ Natisni naročilo     │     │
│                    └──────────────────────┘     │
│                                                 │
│  4. UVOZ DOBAVNICE                              │
│     ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│     │ Uvozi   │→ │ Vnesi   │→ │ Uvozi   │      │
│     │ artikl. │  │ dobavn. │  │ dobavn. │      │
│     └─────────┘  └─────────┘  └─────────┘      │
│                     ↓                          │
│              ┌───────────┐                     │
│              │ Ročno ali │                     │
│              │ CSV paste │                     │
│              └───────────┘                     │
│                     ↓                          │
│              ┌───────────┐                     │
│              │ Avto-     │ → Orodbečeči: +kol  │
│              │ posodob.  │   Novi: ustvarjeni  │
│              │ zalog     │                     │
│              └───────────┘                     │
└─────────────────────────────────────────────────┘
```

---

## 💳 Plačevanje — 5 načinov

```
┌─────────────────────────────────────────────────┐
│  PLAČILO (Payment Dialog)                       │
│                                                 │
│  ┌───────────────────────────────────┐          │
│  │ 5 NAČINOV PLAČILA:                │          │
│  │                                   │          │
│  │  💵 Gotovina                      │          │
│  │    → Vnesi prejeto                │          │
│  │    → Avto vračilo                 │          │
│  │    → Hitri zneski                 │          │
│  │                                   │          │
│  │  💳 Kartica                       │          │
│  │    → Potrdi plačilo               │          │
│  │                                   │          │
│  │  🎁 Darilna kartica               │          │
│  │    → Vnesi kodo (GC-XXXXXXXX)    │          │
│  │    → Preveri stanje               │          │
│  │    → Avto redeem                  │          │
│  │                                   │          │
│  │  📱 Sumup terminal                │          │
│  │    → Pošlji na terminal           │          │
│  │    → Polling (vsako 2s)          │          │
│  │    → Preklic možen                │          │
│  │                                   │          │
│  │  🍎 Apple/Google Pay (Stripe)     │          │
│  │    → Pripravi plačilo             │          │
│  │    → NFC na napravi               │          │
│  │    → Polling (vsako 2s)          │          │
│  └───────────────────────────────────┘          │
│                                                 │
│  DODATNO:                                       │
│  ┌───────────────────────────────────┐          │
│  │ + Napitnina (Brez/5%/10%/15%/€)  │          │
│  │ + Popust (% ali fiksni EUR)       │          │
│  │ + Stranka (loyalty točke)         │          │
│  │ + Split bill (deli med osebami)   │          │
│  └───────────────────────────────────┘          │
│                       ↓                        │
│  ┌───────────────────────────────────┐          │
│  │ FURS FISKALIZACIJA                │          │
│  │ → ZOI (RSA-SHA256 + MD5)          │          │
│  │ → EOR (UUID)                      │          │
│  │ → XML račun                       │          │
│  │ → QR koda                         │          │
│  └───────────────────────────────────┘          │
│                       ↓                        │
│  ┌───────────────────────────────────┐          │
│  │ POST-PLAČILO:                     │          │
│  │ → Inventory auto-deduct           │          │
│  │ → Loyalty točke (1/10€)           │          │
│  │ → Gift card redeem                │          │
│  │ → CDU sync (gost vidi)            │          │
│  └───────────────────────────────────┘          │
└─────────────────────────────────────────────────┘
```

---

## 🚴 Dostava — Wolt + Deliverect workflow

```
┌─────────────────────────────────────────────────┐
│  DOSTAVA (2 integraciji)                        │
│                                                 │
│  WOLT:                                          │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐     │
│  │ Gost    │ →  │ Wolt    │ →  │ Webhook │     │
│  │ naroči  │    │ API     │    │ (POST)  │     │
│  └─────────┘    └─────────┘    └─────────┘     │
│                                    ↓            │
│                    ┌──────────────────────┐     │
│                    │ Avto kreacija Order  │     │
│                    │ operator: "Wolt: ..."│     │
│                    │ Miza: WOLT (dostava) │     │
│                    └──────────────────────┘     │
│                                 ↓               │
│                    ┌──────────────────────┐     │
│                    │ KDS: novo naročilo   │     │
│                    │ POS: vidi v Wolt tab │     │
│                    └──────────────────────┘     │
│                                 ↓               │
│              ┌──────────────────────┐           │
│              │ ✅ Sprejmi           │           │
│              │ 🕐 Pripravljeno      │           │
│              │ 🚴 Prevzeto          │           │
│              │ ❌ Zavrni            │           │
│              └──────────────────────┘           │
│                                                 │
│  DELIVERECT (8 platform):                       │
│  UberEats │ DoorDash │ Just Eat │ Glovo │      │
│  Bolt Food │ Wolt │ Takeaway │ Direktno        │
│  → Enak workflow, enoten vmesnik               │
└─────────────────────────────────────────────────┘
```

---

## 📊 Poročila workflow

```
┌─────────────────────────────────────────────────┐
│  POROČILA IN ANALITIKA                          │
│                                                 │
│  ┌─────────────────────────────────────┐        │
│  │ DAILY                               │        │
│  │ → Dashboard (promet, računi, KPI)  │        │
│  │ → Low-stock alert banner           │        │
│  │ → Z-report (dnevni zaključek)      │        │
│  └─────────────────────────────────────┘        │
│                                                 │
│  ┌─────────────────────────────────────┐        │
│  │ WEEKLY                              │        │
│  │ → Tedenska statistika (7-dnevni)   │        │
│  │ → Labor cost % (strošek dela)      │        │
│  │ → Tip pooling (distribucija)       │        │
│  └─────────────────────────────────────┘        │
│                                                 │
│  ┌─────────────────────────────────────┐        │
│  │ MONTHLY                             │        │
│  │ → Mesečno poročilo (CSV export)    │        │
│  │ → Računovodstvo (4 formati)        │        │
│  │   - CSV (Excel)                     │        │
│  │   - Pantheon (slovenski)            │        │
│  │   - QuickBooks (mednarodni)         │        │
│  │   - XML (eDavki)                    │        │
│  └─────────────────────────────────────┘        │
│                                                 │
│  ┌─────────────────────────────────────┐        │
│  │ AI & ANALYTICS                      │        │
│  │ → Menu Engineering (Bostonska)      │        │
│  │ → AI Demand Forecasting (7-30 dni) │        │
│  │ → Multi-Location Benchmark          │        │
│  │ → Food Waste Tracking               │        │
│  └─────────────────────────────────────┘        │
└─────────────────────────────────────────────────┘
```

---

**Gostilna POS** — vodilna slovenska restavracijska blagajna. 🚀
