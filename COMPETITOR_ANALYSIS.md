# 🔍 Temeljita analiza konkurence — Gostilna POS

Analiza opravljena: december 2024
Vir: Toast POS, Square, Lightspeed, Kassapos (SI), POSEIDON360, Reddit/forumi

---

## 📊 Naše trenutno stanje (prednosti)

Naša POS aplikacija že ima implementirano:

### ✅ Funkcionalno (imamo)
- Multi-tenant SaaS (več restavracij v eni instalaciji)
- FURS fiskalizacija (ZOI, EOR, XML, QR, storno, Z-report) — POC + produkcija
- Sumup terminal integracija
- Tableside ordering (`/natakar` — mobilna aplikacija za natakarje)
- Online naročanje preko QR kode (`/meni`)
- Sledenje naročila v živo (`/sledi/[id]`)
- KDS (Kitchen Display System) z WebSocket
- Inventory management + Recipe Costing + Food Cost %
- CRM/loyalty (točke 1/10€)
- Darilne kartice
- Employee scheduling + Clock In/Out + Labor cost %
- Email/SMS notifikacije
- Napitnine (tips)
- Alergeni EU 1169/2011, hranilna vrednost
- Dvojezičnost SI/EN
- Dark mode, PWA, tipkovne bližnjice
- Rezervacije miz
- Mesečna/tedenska poročila
- Split bill, void items, popusti, modifierji

---

## 🎯 KAJ KONKURENCA IMA, MI PA NE (analiza vrzeli)

### 🥇 1. Wolt / UberEats / DoorDash integracija (KRITIČNO za SI trg)
**Kassapos (Slovenija) že ima to!** — Wolt naročila se samodejno prikažejo v blagajni.

- **Problem**: Restavracije izgubljajo čas z ročnim prepisovanjem Wolt naročil
- **Konkurenca**: Toast ($33/mes), Kassapos, Square — vsi imajo
- **ROI**: Prihranek 15-30 min na dan, manj napak, real-time statistika
- **Implementacija**:
  - Wolt Partner API (OAuth)
  - Webhook za nova naročila
  - Avto-sinhronizacija menija (cene, dostopnost)
  - Enostavno potrdi/zavrni iz POS
  - Ločena statistika za dostavo vs. dine-in

### 🥈 2. AI Demand Forecasting (kompetitivna prednost)
Toast in Lightspeed imata AI napovedi povpraševanja.

- **Problem**: Lastniki ne vedo koliko osebja/zaloge potrebujejo
- **Konkurenca**: Toast "Toast Predict", Lineup.ai, Fourth
- **ROI**: 10-15% zmanjšanje stroškov dela, manj odpadkov
- **Implementacija**:
  - Zgodovina prometa (zadnjih 30/60/90 dni)
  - Vremenski podatki (OpenWeather API)
  - Lokalni dogodki (Facebook Events API)
  - Napoved za naslednji teden (urno)
  - Priporočilo št. osebja per dan

### 🥉 3. Menu Engineering (profitabilnost analiza)
Lightspeed in Toast imata analizo kateri item-i so "zvezde" in "psi".

- **Problem**: Lastniki ne vedo kateri item-i prinašajo profit
- **Konkurenca**: Lightspeed Analytics, Restaurant365
- **ROI**: 10% povečanje prometa z optimizacijo menija
- **Implementacija**:
  - Klasifikacija: Zvezde (visoka profit + popularnost), Konji (nizka profit + popularnost), Uganke (visoka profit + nizka popularnost), Psi (nizko oboje)
  - Food cost % per item (že imamo!)
  - Profit margin per item
  - Priporočila: povišaj ceno, umakni, promoviraj

### 🏅 4. Tip Pooling (avtomatska distribucija napitnin)
Square in Toast imata avtomatsko porazdelitev napitnin.

- **Problem**: Napitnine se ročno porazdeljujejo med osebje
- **Konkurenca**: Square, Toast, Kickfin, Tip Haus
- **ROI**: Pošteno in transparentno, manj konfliktov
- **Implementacija**:
  - Pravila: po urah, po vlogi (natakar 60%, kuhar 20%, host 20%)
  - Dnevni/tedenski izplačil
  - Povezava s scheduling (Timesheet)
  - Poročilo za plačo

### 🎖️ 5. Self-Service Kioski (ne samo QR)
Toast in Square imajo samopostrežne kioske.

- **Problem**: Čakalne vrste na blagajni
- **Konkurenca**: Toast Kiosk, Square Kiosk, Microworks
- **ROI**: 20-30% povečanje povprečnega računa (upselling)
- **Implementacija**:
  - Tablet kiosk mode (celozaslonski meni)
  - Plačilo na mestu (Sumup integracija)
  - Tiskanje računa
  - Večjezično (SI/EN/DE/IT)

### 🎖️ 6. QuickBooks / Xero / Pantheon integracija (računovodstvo)
Square in Toast integrirajo z QuickBooks, slovenski s Pantheon.

- **Problem**: Računovodja ročno vpisuje račune
- **Konkurenca**: QuickBooks, Xero, Restaurant365
- **ROI**: Prihranek 5-10 ur mesečno za računovodjo
- **Implementacija**:
  - Dnevni/mesečni CSV/XML export (imamo osnovno!)
  - Pantheon API (slovensko)
  - QuickBooks Online API
  - Avtomatska klasifikacija (DDV, promet, napitnine)

### 🎖️ 7. Multi-Location Benchmarking
Toast in Lightspeed omogočajo primerjavo med lokacijami.

- **Problem**: Lastnik z 3 restavracijami ne vidi katera je najboljša
- **Konkurenca**: Toast Multi-Location, Lightspeed
- **ROI**: Identifikacija podstandardnih lokacij
- **Implementacija**:
  - Dashboard: primerjava prometa med restavracijami
  - Top/Bottom performerji
  - Benchmark KPI (povprečni račun, food cost %, labor cost %)
  - heatmap po dnevih/urah

### 🎖️ 8. OpenTable / Resy integracija (rezervacije)
OpenTable integrira z 200+ orodji.

- **Problem**: Gostje rezervirajo preko OpenTable, mi ročno prepisujemo
- **Konkurenca**: OpenTable, Resy, Tock (vsak 200+ integracij)
- **ROI**: Manj no-shows, boljša izkušnja
- **Implementacija**:
  - OpenTable Partner API
  - Avtomatska sinhronizacija miz
  - Dvojna knjiga (POS + OpenTable)
  - Guest profiling (alergije, preference)

### 🎖️ 9. Food Waste Tracking
Checkmate in Fourth imajo sledenje odpadkov.

- **Problem**: Odpadki so 4-10% prometa, ne sledijo
- **Konkurenca**: Checkmate, Fourth, Leanpath
- **ROI**: 2-4% zmanjšanje stroškov
- **Implementacija**:
  - "Waste" gumb v KDS (pokvarjeno, pretečeno, vrnjeno)
  - Razlog + količina + item
  - Povezava z inventory (avto-deduct)
  - Poročilo: top odpadki, trend po dnevih

### 🎖️ 10. Customer Display Unit (CDU) — drugi zaslon
Toast in Square imajo drugi zaslon za gosta.

- **Problem**: Gost ne vidi kaj se blagajni
- **Konkurenca**: Toast, Square, Lightspeed
- **ROI**: Boljša transparentnost, manj napak
- **Implementacija**:
  - Secondary window (window.open)
  - Prikaz: postavke, skupaj, DDV
  - QR koda za sledenje
  - Reklame / meni dneva med mirovanjem

### 🎖️ 11. Apple Pay / Google Pay (ne samo kartica)
Square in Toast podpirajo mobilna plačila.

- **Problem**: Sumup je samo kartica, nimamo Apple Pay
- **Konkurenca**: Square, Toast, Stripe
- **ROI**: Hitrejše plačevanje, mlajša demografija
- **Implementacija**:
  - Stripe Terminal SDK (Apple Pay, Google Pay)
  - Ali Sumup tap-to-pay (iOS 16.4+)
  - QR plačilo (UPN)

### 🎖️ 12. Multi-Step KDS Routing
Toast KDS omogoča usmerjanje na več postaj (hladno, vroče, pijača).

- **Problem**: Vse gre na en zaslon, kuharji ne vedo kaj je njihovo
- **Konkurenca**: Toast, Lightspeed, Square KDS
- **ROI**: Hitrejša priprava, manj napak
- **Implementacija**:
  - KDS postaje (hladna, vroča, pijača, sladica)
  - Routing rules per kategorijo
  - Ločene čakalne vrste
  - Bump all / bump by station

### 🎖️ 13. Loyalty App (mobilna aplikacija za stranke)
Square Loyalty, Toast Rewards.

- **Problem**: Točke zvestobe so samo v POS, gost jih ne vidi
- **Konkurenca**: Square Loyalty, Toast Rewards, Punchh
- **ROI**: 20% več povratnih gostov
- **Implementacija**:
  - Mobilna aplikacija (React Native / PWA)
  - QR koda stranke (ne samo telefonska številka)
  - Push notifikacije (ponudbe)
  - zgodovina nakupov
  - Nagrade (npr. 100 točk = brezplačna pijača)

### 🎖️ 14. Happy Hour / Time-Based Pricing
Toast in Square podpirajo časovno odvisne cene.

- **Problem**: Happy hour cene se ročno nastavljajo
- **Konkurenca**: Toast, Square, Lightspeed
- **ROI**: 15-30% povečanje prometa v mrtvih urah
- **Implementacija**:
  - Pravila: "Pijača -30% 16-18h vsak dan"
  - Auto-apply ob casu
  - Prikaz na meniju (prečrtana cena)
  - Poročilo: happy hour vpliv na promet

### 🎖️ 15. Combo Meals / Set Menus
Lightspeed in Toast podpirajo kompleksne menuje.

- **Problem**: "Meni 1" (juha + glavna + sladica) moraš ročno sešteti
- **Konkurenca**: Toast, Lightspeed, Square
- **ROI**: 10% povečanje povprečnega računa
- **Implementacija**:
  - Combo item (fiksna cena)
  - Izbira pod-itemov (npr. izberi 1 od 3 juh)
  - Popust vgrajen (cena combo < vsota posameznih)
  - Inventory deduction za vse pod-iteme

---

## 🏆 TOP 5 PRIORITET (po ROI za slovenski trg)

| # | Funkcija | ROI | Težavnost | Slovenski poudarek |
|---|----------|-----|-----------|-------------------|
| 1 | **Wolt integracija** | ⭐⭐⭐⭐⭐ | Srednja | Kassapos že ima — moramo dohiteti |
| 2 | **Menu Engineering** | ⭐⭐⭐⭐ | Nizka | Food cost imamo, dodaj analizo |
| 3 | **Tip Pooling** | ⭐⭐⭐⭐ | Nizka | Napitnine imamo, dodaj distribucijo |
| 4 | **Multi-Location Benchmark** | ⭐⭐⭐⭐ | Nizka | Multi-tenant imamo, dodaj primerjavo |
| 5 | **Food Waste Tracking** | ⭐⭐⭐ | Nizka | Inventory imamo, dodaj "waste" gumb |

---

## 💡 PREDLOG IMPLEMENTACIJE

### Faza 1 (hitri dosežki — 1 dan):
1. **Menu Engineering** — analiza zvezd/konjev/ugank/psov (imamo podatke)
2. **Tip Pooling** — distribucija napitnin po urah/vlogah (imamo timesheet)
3. **Multi-Location Benchmark** — primerjalni dashboard (imamo multi-tenant)
4. **Food Waste Tracking** — "Waste" gumb v inventory (imamo inventory)

### Faza 2 (srednje — 2-3 dni):
5. **Self-Service Kiosk** — tablet mode + Sumup plačilo
6. **Customer Display Unit** — secondary window za gosta
7. **Happy Hour** — časovno odvisne cene
8. **Multi-Step KDS Routing** — postaje (vroča, hladna, pijača)

### Faza 3 (napredno — 1 teden):
9. **Wolt integracija** — Partner API (ključno za SI trg)
10. **AI Demand Forecasting** — napoved povprašanja
11. **QuickBooks/Pantheon** — računovodstvo integracija
12. **Loyalty App** — mobilna aplikacija za stranke

---

## 📈 STRATEŠKI NASVET

Za **prodajo v Sloveniji** je ključno dohiteti **Kassapos** (Wolt integracija). To je trenutno največja konkurenčna prednost ki jo imajo slovenski konkurenti.

Za **prodajo v EU/mednarodno** je ključno dodati:
- AI forecasting (Toast/Lightspeed standard)
- Multi-location benchmarking
- Mobile wallet podpora (Apple Pay/Google Pay)

Naša aplikacija je že močna — imamo multi-tenant, FURS, Sumup, tableside, scheduling, inventory, CRM, gift cards, KDS, online ordering. Manjka predvsem **integracije z ekosistemom** (Wolt, OpenTable, QuickBooks) in **AI/napredne analitike**.
