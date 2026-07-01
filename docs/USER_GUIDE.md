# 📖 Gostilna POS — Uporabniški vodič

> Popolni vodič za uporabo slovenske restavracijske blagajne (POS) z 100+ funkcijami.
> Navdihnjeno po dokumentaciji Toast POS, Square, Lightspeed, in best practices iz svetovnih POS aplikacij.

---

## 📑 Kazalo

1. [Hitri začetek (10 minut)](#1-hitri-začetek-10-minut)
2. [Nastavitev restavracije](#2-nastavitev-restavracije)
3. [Meni — dodajanje in upravljanje](#3-meni--dodajanje-in-upravljanje)
4. [Zaloge — katalog, uvoz in upravljanje](#4-zaloge--katalog-uvoz-in-upravljanje)
5. [Operaterji (blagajniki)](#5-operaterji-blagajniki)
6. [Mize in rezervacije](#6-mize-in-rezervacije)
7. [Dnevni workflow (odprtje → zaprtje)](#7-dnevni-workflow-odprtje--zaprtje)
8. [Naročanje in plačevanje](#8-naročanje-in-plačevanje)
9. [Kuhinja (KDS)](#9-kuhinja-kds)
10. [Natakar (Tableside)](#10-natakar-tableside)
11. [Online naročanje (gosti)](#11-online-naročanje-gosti)
12. [Kiosk (samopostrežba)](#12-kiosk-samopostrežja)
13. [Loyalty App (zvestoba)](#13-loyalty-app-zvestoba)
14. [Dostava (Wolt + Deliverect)](#14-dostava-wolt--deliverect)
15. [Rezervacije (OpenTable)](#15-rezervacije-opentable)
16. [Poročila in analitika](#16-poročila-in-analitika)
17. [Računovodstvo (export)](#17-računovodstvo-export)
18. [Napredne funkcije](#18-napredne-funkcije)
19. [Nastavitve in konfiguracija](#19-nastavitve-in-konfiguracija)
20. [FAQ — pogosta vprašanja](#20-faq--pogosta-vprašanja)

---

## 1. Hitri začetek (10 minut)

### Korak 1: Prijava
1. Odpri aplikacijo na `/`
2. Klikni **"Prijava s PIN"** v zgornjem pasu
3. Vnesi 4-mestni PIN (demo: `9999` za admin, `1234` za blagajnika)
4. Prijavljen si! 🎉

### Korak 2: Nastavi restavracijo
- Klikni **Nastavitve** v stranski vrstici
- Preveri: ime restavracije, davčna številka, poslovni prostor, blagajna
- Nastavi FURS certifikat (če ga imaš)

### Korak 3: Uvozi meni
- Klikni **Meni** v stranski vrstici
- Demo meni (34 postavk) je že naložen
- Za nove postavke: klikni **"Nova postavka"**

### Korak 4: Uvozi zaloge
- Klikni **Zaloga** v stranski vrstici
- Klikni **"Uvozi artikle"**
- Izberi kategorije (Meso, Pijače, itd.) ali klikni **"Uvozi vse (361)"**
- Klikni **"Bulk zaloga"** za hitro nastavitev stanj

### Korak 5: Začni delati!
- Klikni **Mize** → izberi mizo → dodaj postavke → **Plačaj**
- Glej [Dnevni workflow](#7-dnevni-workflow-odprtje--zaprtje) za popolne navodila

---

## 2. Nastavitev restavracije

### Osnovni podatki
1. **Nastavitve** → posodobi:
   - Ime restavracije
   - Davčna številka (npr. SI12345678)
   - Oznaka poslovnega prostora (npr. PREVOZ11)
   - Oznaka blagajne (npr. BLAG01)

### Multi-tenant (več restavracij)
- V zgornjem pasu klikni **dropdown** z imenom restavracije
- Izberi drugo restavracijo ali dodaj novo preko `/api/restaurants`
- Vsaka restavracija ima ločene: meni, mize, zaloge, operaterje, račune

### FURS konfiguracija
1. **Nastavitve** → FURS sekcija
2. Naloži `.p12` certifikat (iz eDavki)
3. Nastavi geslo certifikata
4. Izberi okolje: **Test** ali **Produkcija**
5. Klikni **"INI registracija"** za registracijo naprave pri FURS
6. Klikni **"Test FURS"** za preverjanje

---

## 3. Meni — dodajanje in upravljanje

### Dodajanje nove postavke
1. **Meni** → klikni **"Nova postavka"**
2. Izpolni: ime, kategorija, cena, DDV stopnja (9.5% ali 22%)
3. Opcijsko: opis, alergeni, kalorije, slika
4. Shrani

### AI slike jedi
1. **Slike jedi** v stranski vrstici
2. Klikni na artikel → **"AI"** gumb za generiranje slike
3. Ali: **"Generiraj 5 AI slik"** za batch generiranje
4. Ali: klikni **"Naloži"** za ročni upload

### Modifierji (dodatki)
1. **Meni** → klikni na artikel → **"Modifierji"**
2. Dodaj: npr. "Brez čebule" (0€), "Dobra pečena" (0€), "Gobe dodaj" (+2.5€)

### Kategorije
- 🥗 Predjedi (DDV 9.5%)
- 🍽️ Glavne jedi (DDV 9.5%)
- 🍰 Sladice (DDV 9.5%)
- 🥤 Brezalkoholne (DDV 9.5%)
- 🍷 Alkoholne (DDV 22%)

### Menu Engineering (analiza profitabilnosti)
1. **Menu Engineering** v stranski vrstici
2. Sistem avtomatsko klasificira postavke:
   - ⭐ **Zvezda**: visok profit + visoka popularnost
   - 📈 **Konj**: nizek profit + visoka popularnost
   - 🧩 **Uganka**: visok profit + nizka popularnost
   - 🐕 **Pes**: nizek profit + nizka popularnost
3. Sledi priporočilom za optimizacijo menija

---

## 4. Zaloge — katalog, uvoz in upravljanje

### Hitri začetek zalog
1. **Zaloga** → **"Uvozi artikle"**
2. Klikni na kategorijo (npr. "🥩 Meso in mesnine (36)")
3. Ali: dvojni klik za uvoz cele kategorije
4. Ali: klikni **"Uvozi vse (361)"** za vse artikle
5. Vsi uvoženi artikli imajo **stanje 0**

### Bulk nastavitev zalog
1. **Zaloga** → **"Bulk zaloga"**
2. Filtriraj po kategoriji ali "Stanje 0"
3. Klikni hitre gumb: **0, 1, 5, 10, 20, 50** za vse filtrirane
4. Ali vnašaj posamezno v tabeli
5. Klikni **"Shrani (N)"** za potrditev

### Uvoz dobavnice
1. **Zaloga** → **"Uvozi artikle"** → **"Uvoz dobavnice"** tab
2. Vnesi dobavitelja in številko dobavnice
3. Dodaj postavke (ime, količina, enota, cena)
4. Ali: klikni **"Prilepi CSV"** (format: ime,količina,enota,cena)
5. Klikni **"Uvozi dobavnico"**
6. Sistem samodejno posodobi zaloge (obstoječi se povečajo, novi se ustvarijo)

### Reorder report (pametno naročanje)
1. **Zaloga** → **"Naroči"**
2. Sistem prikaže artikle z nizko zalogo, grupirane po dobavitelju
3. Predlagana količina: min×2 ali minimum 10 enot
4. Kontakti dobaviteljev (telefon, email, website)
5. Klikni **"Natisni"** za tiskanje naročila

### Recipe Manager (food cost)
1. **Zaloga** → **"Recipe Manager"**
2. Poveži meni postavko z inventarjem (npr. Biftek → 200g govedine)
3. Sistem izračuna **food cost %** per jed
4. Ob plačilu se zaloga samodejno odšteje

### Food Waste Tracking
1. **Odpadki** v stranski vrstici
2. Klikni **"Zabeleži odpadek"**
3. Izberi artikel, količino in razlog (6 razlogov)
4. Opcijsko: odštej iz zaloge
5. Sistem analizira: top odpadki, dnevni trend, waste % prometa

---

## 5. Operaterji (blagajniki)

### Dodajanje operaterja
1. **Operaterji** v stranski vrstici
2. Klikni **"Nov operater"** (samo admin)
3. Izpolni: ime, 4-mestni PIN, davčna številka, vloga (cashier/admin)
4. Nastavi urno postavko (za labor cost)
5. Shrani

### Vloge
- **Admin**: polni dostop (nastavitve, operaterji, FURS, računovodstvo)
- **Cashier**: blagajna, mize, naročila, plačila

### PIN login
- Vsak operater ima unikatnen 4-mestni PIN (per restavracija)
- PIN se preverja preko backend API
- FURS zahteva sledljivost operaterjev (kdo je izdal račun)

---

## 6. Mize in rezervacije

### Mize
- **Mize** v stranski vrstici prikazuje tloris lokala
- 3 sekcije: 🏛️ Dvorana, 🌿 Terasa, 🔒 Zasebna
- Barvni statusi: 🟢 Prosta, 🟡 Odprto naročilo, 🔴 Plačano
- Klik na mizo = odpri naročilo

### Mize admin
1. **Mize admin** v stranski vrstici
2. Dodaj/uredi/izbriši mize
3. Nastavi: številka, ime, št. sedežev, sekcija

### Rezervacije
1. **Rezervacije** v stranski vrstici
2. Klikni na prosto mizo v koledarju
3. Izpolni: ime stranke, telefon, št. oseb, datum, ura, trajanje
4. Opombe: alergije, priložnosti (rojstni dan)
5. Status: potrjeno → sedeči → ni prišel / preklicano

### OpenTable/Resy sinhronizacija
1. **OpenTable/Resy** v stranski vrstici
2. Konfiguriraj OpenTable API ključe v .env
3. Klikni **"Sinhroniziraj iz OpenTable"** za prenos rezervacij
4. Sistem samodejno poišče prosto mizo (partySize + časovni konflikt)

---

## 7. Dnevni workflow (odprtje → zaprtje)

### ☀️ Odprtje (zjutraj)

#### 1. Prijava
- PIN login (admin ali cashier)

#### 2. Odpri smeno
- **Smena** → **"Začni novo smeno"**
- Vnesi začetno stanje gotovine
- Sistem ustvari nov Shift zapis

#### 3. Preveri zaloge
- **Zaloga** → preveri low-stock alerte
- Ali: **Dashboard** → klikni na low-stock banner
- Če treba: **"Naroči"** → reorder report

#### 4. Preveri rezervacije
- **Rezervacije** → preveri današnje rezervacije
- Pripravi mize za rezervacije

#### 5. Preveri meni
- **Meni** → preveri da so vse postavke "available"
- Nastavi dnevno special (isDailySpecial)

### 🔄 Med delom

#### Sprejemanje naročil
1. **Mize** → klikni na mizo
2. **Naročilo** → dodaj postavke v voziček
3. Uporabi modifierje (brez čebule, itd.)
4. **"Pošlji v kuhinjo"** → KDS se osveži v živo
5. Čakaj na pripravo → KDS pokaže "Pripravljeno"
6. Gost jedje → **"Plačaj"**

#### Plačevanje
1. Klikni **"Plačaj"** v naročilu
2. Izberi način plačila:
   - 💵 Gotovina (z vračilom)
   - 💳 Kartica
   - 🎁 Darilna kartica (vnesi kodo)
   - 📱 Sumup terminal (pošlji na terminal)
   - 🍎 Apple/Google Pay (Stripe)
3. Dodaj napitnino (%, fiksni EUR, hitri gumbi)
4. Poveži stranko (loyalty točke)
5. Potrdi → račun se fiskalizira (FURS ZOI + EOR)
6. Natisni račun

#### Dostavna naročila
- **Wolt dostava** → preveri nova Wolt naročila
- **Deliverect** → preveri naročila iz vseh platform (UberEats, DoorDash, itd.)
- Sprejmi/zavrni/označi pripravljeno

### 🌙 Zaprtje (zvečer)

#### 1. Zapri smeno
- **Smena** → **"Zaključi smeno"**
- Vnesi končno stanje gotovine
- Sistem izračuna: promet, št. računov, napitnine, razlika
- Preveri: pričakovano gotovino vs. dejansko

#### 2. Z-report
- **Z-report** → **"Generiraj Z-report"**
- Dnevni zaključek blagajne (FURS zahteva)
- Prikaz: promet po DDV stopnjah, načini plačila, storno

#### 3. Preveri poročila
- **Pregled** → dashboard s dnevnimi KPI
- **Menu Engineering** → preveri profitabilnost
- **Računovodstvo** → izvozi dnevni CSV/Pantheon/XML

#### 4. Odjava
- Klikni svoje ime v zgornjem pasu → **Odjava**

---

## 8. Naročanje in plačevanje

### Sprejemanje naročila
1. **Mize** → klikni na mizo
2. **Naročilo** view se odpre
3. Brskaj po kategorijah ali išči
4. Klikni na artikel za dodajanje v voziček
5. Klikni na artikel v vozičku za modifierje
6. Dodaj opombo (npr. "brez čebule")
7. Klikni **"Pošlji v kuhinjo"**

### Popusti
- Klikni **"Popust"** v vozičku
- Izberi: % (5%, 10%, 15%) ali fiksni EUR
- Popust se aplikira na celoten račun

### Split bill
- Klikni **"Razdeli"** v plačilnem dialogu
- Izberi postavke za vsako osebo
- Vsaka oseba plača posebej

### Napitnine
- V plačilnem dialogu: izberi **Brez / 5% / 10% / 15% / €**
- Ali vnesi fiksni znesek
- Napitnina se prikaže na računu in v zaključku smene

### CDU (zaslon za gosta)
- Odpri `/cdu` v drugem tab-u (drugi zaslon)
- POS samodejno sinhronizira voziček v realnem času
- Gost vidi: postavke, skupaj, promocije

---

## 9. Kuhinja (KDS)

### Osnovni workflow
1. Naročilo iz POS se samodejno prikaže v KDS
2. Kuhar vidi: miza, postavke, opombe, čas
3. Klikni **"Začni pripravo"** → status: V pripravi
4. Klikni **"Pripravljeno"** → status: Pripravljeno
5. Klikni **"Pozovi mizo"** → zvok + toast obvestilo v POS

### Multi-Step Routing (4 postaje)
- 🍽️ **Vse postaje** — vsa naročila
- 🔥 **Vroča** — glavne jedi, predjedi
- 🥗 **Hladna** — hladne predjedi, solate
- 🍹 **Pijača** — alkohol, brezalkoholne
- 🍰 **Sladice** — sladice, torte

### Timerji in opozorila
- Naročila starejša od 10 minut dobijo **rdeči ring**
- Priority badge za nujna naročila

---

## 10. Natakar (Tableside)

### Dostop
- Odpri `/natakar` na mobilni napravi
- PIN login (demo: 1234, 5678, 9999)

### Sprejemanje naročil
1. **Mize** tab → izberi mizo
2. **Meni** tab → dodaj postavke v voziček
3. Klikni na artikel za količino in opombo
4. **Voziček** → pregled in urejanje
5. **"Pošlji v kuhinjo"** → naročilo gre v KDS

### Moja naročila
- **Naročila** tab → vsa tvoja odprta naročila
- Avto-osvežitev vsakih 5 sekund

---

## 11. Online naročanje (gosti)

### QR koda na mizi
1. Gost poskenira QR kodo na mizi
2. Odpre se javni meni na `/meni`
3. Gost doda postavke v voziček
4. Izbere: na mizi ali takeaway
5. Potrdi naročilo → dobi ID za sledenje

### Sledenje naročila
- Gost odpre `/sledi/[id]`
- Status v živo: prejeto → v pripravi → pripravljeno → servirano

### Alergeni in hranilna vrednost
- Vsaka postavka ima 13 alergenov EU z ikonami
- Hranilna vrednost: kalorije, beljakovine, ogljikovi hidrati, maščobe
- Filter po alergenih

### Dvojezičnost
- Gost lahko preklopi med **Slovenščina** in **English**

---

## 12. Kiosk (samopostrežba)

### Dostop
- Odpri `/kiosk` na tablici ali velikem zaslonu
- Celozaslonski, touch-friendly vmesnik

### Workflow gosta
1. Brskaj po kategorijah ali išči
2. Klikni na artikel za dodajanje v voziček
3. Preglej voziček (količine, skupaj)
4. Klikni **"Plačaj"**
5. Izberi: gotovina ali kartica
6. Potrdi → naročilo se ustvari in fiskalizira
7. Success screen z ID-jem za sledenje

### Upsell AI
- Sistem predlaga dodatke ("Ali želite pijačo?")
- Glede na vsebino vozička (market basket analysis)

### Tiskanje
- Po plačilu: klikni **"Natisni račun"**
- Ali: **"Sledi naročilu"** za sledenje statusa

---

## 13. Loyalty App (zvestoba)

### Dostop
- Odpri `/zvestoba` na mobilni napravi
- Login s telefonsko številko

### 5 tabov
1. **Domov** — točke, level, QR kartica, push notifikacije
2. **Naroči** — Order Ahead (naroči pred prihodom)
3. **Kartica** — predplačilna kartica (polnitev, transakcije)
4. **Nagrade** — 8 nagrad z unovčevanjem
5. **Dosežki** — 12 badge-ov + 3 izzivi

### Level sistem
- 🥉 Novinec (0+ točk)
- 🥉 Bronca (100+ točk)
- 🥈 Srebro (200+ točk)
- 🥇 Zlato (500+ točk)

### Nagrade (8)
- ☕ Brezplačna kava (15 točk)
- 🍰 Brezplačna sladica (30 točk)
- 🍺 Brezplačno pivo (25 točk)
- 🥗 Brezplačna predjed (40 točk)
- 💰 10€ popust (100 točk)
- 🍽️ Brezplačna glavna jed (80 točk)
- 💸 25€ popust (250 točk)
- 🥂 Večerja za 2 (500 točk)

### Order Ahead
1. **Naroči** tab
2. Izberi jedi, čas prevzema, tip (na mizi / poberi)
3. Potrdi → naročilo se shrani + točke se dodajo
4. Success screen z ID-jem za sledenje

### Predplačilna kartica
1. **Kartica** tab
2. Klikni **"Naloži"** (10€, 20€, 50€, 100€ ali poljubno)
3. Plačaj z naloženim stanjem v restavraciji ali online

### Gamification
- **12 badge-ov**: prvi obisk, 10 obiskov, 500€ porabe, itd.
- **3 izzivi**: 5 obiskov/mesec, 100€/mesec, 50 točk
- Odklenjeni badge-i so poudarjeni

---

## 14. Dostava (Wolt + Deliverect)

### Wolt
1. **Wolt dostava** v stranski vrstici
2. Konfiguriraj Wolt API v .env (WOLT_CLIENT_ID, itd.)
3. Registriraj webhook URL v Wolt Partner dashboard
4. Wolt naročila se samodejno prikažejo v POS in KDS
5. Sprejmi/zavrni/označi pripravljeno/prevzeto

### Deliverect (8 platform)
1. **Deliverect** v stranski vrstici
2. Konfiguriraj Deliverect API v .env
3. Podprte platforme: UberEats, DoorDash, Just Eat, Glovo, Bolt, Wolt, Direktno
4. Vsa naročila iz vseh platform na enem mestu
5. Sprejmi/zavrni/ready/pickup

---

## 15. Rezervacije (OpenTable)

### OpenTable/Resy
1. **OpenTable/Resy** v stranski vrstici
2. Konfiguriraj OPENTABLE_API_KEY v .env
3. Klikni **"Sinhroniziraj iz OpenTable"**
4. Rezervacije se samodejno uvozijo z iskanjem proste mize
5. Status: Potrjeno → Sedeči / Ni prišel / Preklicano

---

## 16. Poročila in analitika

### Dashboard
- **Pregled** v stranski vrstici
- KPI: prihodek danes, št. računov, povprečni račun, napitnine
- Urni graf prometa
- Top izdelki
- Načini plačila
- Low-stock alert banner

### Menu Engineering
- **Menu Engineering** v stranski vrstici
- Bostonska matrika: Zvezde/Konji/Uganke/Psi
- Filter po klasifikaciji
- Priporočila per item

### AI Demand Forecasting
- **AI napoved** v stranski vrstici
- Napoved za naslednjih 7/14/30 dni
- Priporočilo osebja (polna/standardna/minimalna zasedba)
- Top item-i z priporočilom zaloge

### Multi-Location Benchmark
- **Benchmark lokacij** v stranski vrstici
- Primerjava vseh restavracij
- Top/bottom performer
- KPI: promet, profit, food cost %, labor cost %

### Tedenska/mesečna poročila
- **Tedenska statistika** — 7-dnevni trend
- **Mesečno poročilo** — mesečni promet, CSV export

---

## 17. Računovodstvo (export)

### 4 formati izvoza
1. **Računovodstvo** v stranski vrstici
2. Izberi datumski interval
3. Klikni enega od 4 formatov:
   - 📄 **CSV (Excel)** — splošni format z BOM
   - 🏢 **Pantheon** — slovenski format (;)
   - 🧮 **QuickBooks** — mednarodni format (,)
   - 📋 **XML (eDavki)** — za slovenski eDavki portal

### DDV breakdown
- Prikaz po stopnjah: 22% in 9.5%
- Osnova, DDV, bruto per stopnja
- Načini plačila z deleži

---

## 18. Napredne funkcije

### Happy Hour
- **Happy Hour** v stranski vrstici
- Ustvari pravilo: dnevi, ura, popust (% ali fiksni), kategorije
- Avtomatsko se aplicira v POS in Online Meni

### Combo Meals
- **Combo meniji** v stranski vrstici
- Ustvari set meni (npr. "Lunch meni: juha + glavna + pijača = 15€")
- Slot-i z izbiro (min/max izbire, obvezno/opcijsko)

### Tip Pooling
- **Razpored** → **Tip Pool** tab
- 3 metode: hours, role, hybrid (ure × vloga)
- Role weights: waiter 1.0×, cashier 0.8×, cook 0.6×

### Employee Scheduling
- **Razpored** → **Tedenski razpored** tab
- Grid operaterji × 7 dni
- Click na dan za dodajanje shift-a

### Clock In/Out
- **Razpored** → **Clock In/Out** tab
- Hitri gumbi per operater
- Dnevnik ur z trajanjem

### Labor Cost
- **Razpored** → **Labor Cost** tab
- Strošek dela vs. promet (%)
- Per-operater breakdown
- Idealni labor cost: 25-30%

### Slike jedi (AI)
- **Slike jedi** v stranski vrstici
- AI generiranje (ZAI image generation)
- Batch generiranje (5 naenkrat)
- Ročni upload

### Upsell AI
- V Kiosk in Online Meni
- "Priporočamo še" banner
- Market basket analysis

### Customer Display Unit
- Odpri `/cdu` v drugem tab-u
- Real-time sync z POS (BroadcastChannel)
- Promocije med mirovanjem

---

## 19. Nastavitve in konfiguracija

### .env spremenljivke

```bash
# Baza
DATABASE_URL="file:./db/custom.db"

# FURS
FURS_TAX_NUMBER="SI12345678"
FURS_BUSINESS_UNIT="PREVOZ11"
FURS_CASH_REGISTER="BLAG01"
FURS_CERT_PATH=""
FURS_CERT_PASSWORD=""
FURS_ENV="test"

# Sumup (terminal plačila)
SUMUP_API_KEY=""
SUMUP_MERCHANT_CODE=""
SUMUP_TERMINAL_ID=""

# Stripe (Apple Pay / Google Pay)
STRIPE_SECRET_KEY=""
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""

# Wolt (dostava)
WOLT_CLIENT_ID=""
WOLT_CLIENT_SECRET=""
WOLT_MERCHANT_ID=""
WOLT_WEBHOOK_SECRET=""

# Deliverect (agregator dostave)
DELIVERECT_CLIENT_ID=""
DELIVERECT_CLIENT_SECRET=""
DELIVERECT_LOCATION_ID=""
DELIVERECT_WEBHOOK_SECRET=""

# OpenTable (rezervacije)
OPENTABLE_API_KEY=""
OPENTABLE_RESTAURANT_ID=""
OPENTABLE_WEBHOOK_SECRET=""

# Push notifikacije
NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
```

### FURS produkcija
1. Pridobi eDavki certifikat (.p12)
2. Nastavi pot v .env (FURS_CERT_PATH)
3. Nastavi geslo (FURS_CERT_PASSWORD)
4. Nastavi FURS_ENV="production"
5. Klikni **"INI registracija"** v Nastavitvah
6. Testiraj z **"Test FURS"**

---

## 20. FAQ — pogosta vprašanja

### Kako spremenim ceno artikla?
- **Meni** → klikni na artikel → uredi ceno → shrani

### Kako dodam novo mizo?
- **Mize admin** → **"Nova miza"** → izpolni podatke

### Kaj če internet pade?
- Aplikacija je PWA z offline podporo (service worker)
- KDS deluje prek WebSocket (local)
- Računi se shranijo lokalno in sinhronizirajo ko internet vrne

### Kako nastavim Happy Hour?
- **Happy Hour** → **"Novo pravilo"** → izberi dneve, ure, popust, kategorije

### Kako uvozim dobavnico?
- **Zaloga** → **"Uvozi artikle"** → **"Uvoz dobavnice"** → prilepi CSV ali vnesi ročno

### Kako vidim kaj moram naročiti?
- **Zaloga** → **"Naroči"** → reorder report z predlogi in kontakti dobaviteljev

### Kako izvozim račune za računovodjo?
- **Računovodstvo** → izberi datum → klikni format (CSV/Pantheon/QuickBooks/XML)

### Kako dodam operaterja?
- **Operaterji** → **"Nov operater"** (samo admin) → izpolni podatke

### Kako spremenim restavracijo (multi-tenant)?
- V zgornjem pasu klikni dropdown z imenom → izberi drugo

### Kako uporabljam Loyalty App?
- Odpri `/zvestoba` → login s telefonom → vidi točke, nagrade, order ahead

---

## 📞 Podpora

Za pomoč in vprašanja:
- 📧 Email: info@gostilnaprimarku.si
- 📞 Telefon: 01 234 56 78
- 🌐 Web: www.gostilnaprimarku.si

---

**Gostilna POS** — vodilna slovenska restavracijska blagajna z 100+ funkcijami. 🚀
