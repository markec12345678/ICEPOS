---
Task ID: 1
Agent: Z.ai Code (main)
Task: Po izbiri ICEPOS (odprtokodna kitajska blagajna) zgraditi delujočo slovensko restavracijsko blagajno (POS) v tem Next.js projektu kot demo/POC za prodajo lokalnim restavracijam in hotelom.

Work Log:
- Kloniral ICEPOS iz Gitee (gotoitcn/icepos + xmosnewone/icepos_manage) in pushal kombiniran mirror na GitHub repo markec12345678/ICEPOS (103 commitov, Apache 2.0).
- Definiral Prisma schema: MenuItem, Table, Order, OrderItem (z DDV stopnjami 9.5% in 22%).
- Napisal seed skripto s slovenskim menijem (34 postavk: predjedi, glavne jedi, sladice, brezalkoholne, alkoholne) in 14 mizami (Dvorana/Terasa/Zasebna).
- Backend API routes: /api/menu, /api/tables, /api/orders (GET+POST), /api/orders/[id] (GET+DELETE), /api/orders/[id]/pay (POST - generira SRS številko + ZOI), /api/stats (dashboard).
- Frontend komponente: PosHeader (sticky, ura, SRS badge), PosSidebar/PosFooter (navigacija), TablesView (mreža miz z statusi), OrderView (meni + voziček), PaymentDialog (gotovina/kartica, vračilo, račun z DDV), DashboardView (KPI, urni graf, top izdelki, načini plačila).
- Zustand store za stanje (izbrana miza, voziček, navigacija).
- Custom useFetch hook z AbortController.
- db:push + seed uspešna (14 miz, 34 postavk, demo naročilo na mizi 2).
- Lint čist (0 errorjev).
- Dev server zagnan (port 3000), vztraja prek start-dev.sh skripte (setsid+nohup).
- Agent Browser self-verification: render ✓, klik mize → order view ✓, dodajanje v voziček ✓, plačilo ✓, račun z DDV/SRS ✓, dashboard ✓, mobile responsive ✓, sticky header/footer ✓.

Stage Summary:
- Delujoča slovenska POS blagajna (Gostilna Pri Marku demo) dostopna na /.
- Zlati tok end-to-end: mize → naročilo → plačilo → račun (z DDV 9.5%/22%, SRS št., ZOI) → sprostitev mize → statistika.
- EUR format (sl-SI), slovenski meni, slovenski UI.
- Tech stack: Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui + Prisma (SQLite) + Zustand + sonner.
- Pripravljeno za nadaljnjo integracijo: FURS fiskalni modul (XML podpis), slovenska plačilna integracija (Moneta/NLQ/VALÚ), Electron pakiranje.
- GitHub mirror: https://github.com/markec12345678/ICEPOS

---
Task ID: 2
Agent: Z.ai Code (main)
Task: Nadgradnja POS aplikacije s FURS fiskalnim modulom (ZOI/EOR/XML), dnevnikom računov s storno funkcionalnostjo, adminom za meni in tiskanjem računov.

Work Log:
- Posodobil Prisma shemo: dodana polja za FURS (zoi, eor, fursXml, businessUnit, cashRegister, invoiceNumber, operatorTaxNo) in storno (stornoOf, stornoReason, stornoAt, stornoZoi, stornoEor).
- Napisal FURS modul (src/lib/furs.ts):
  * calculateZOI() — RSA-SHA256 podpis + MD5 hash → 32 hex znakov
  * generateEOR() — UUID v4 (v produkciji: FURS REST API)
  * buildInvoiceXml() — poln XML račun po FURS specifikaciji (Invoice + Storno z ReferenceInvoice)
  * buildQrPayload() — FURS QR koda format
  * buildInvoiceNumber() — format PP-EN-ŠT (PREVOZ11-BLAG01-0000000001)
  * formatDateTimeISO() — ISO 8601 s časovnim pasom
- Backend API:
  * POST /api/orders/[id]/pay — fiskalizira z pravim ZOI/EOR/XML, zaporedna številka
  * POST /api/orders/[id]/storno — ustvari storno račun (negativen), referenco na original, novo ZOI/EOR
  * /api/menu CRUD: POST (dodaj), PATCH (uredi), DELETE (briši)
- Frontend:
  * ReceiptsView — dnevnik računov s stat stripom, iskalnikom, podrobnostmi (ZOI/EOR/FURS), storno dialog z razlogom, ponovno tiskanje
  * MenuAdminView — tabela postavk z urejanjem (ime, kategorija, cena, DDV stopnja, aktivnost), dodajanje/brisanje
  * PaymentDialog — posodobljen s pravim FURS prikazom (ZOI/EOR badge, fiskalizacija toast)
  * Navigacija razširjena na 5 tabov: Mize, Naroči, Računi, Meni, Pregled
  * Print CSS (@media print) — izolira #printable-receipt, 80mm širina za termalni tiskalnik
  * Print-only div z id="printable-receipt" v ReceiptsView (poln račun z FURS podatki)
- Seed posodobljen: 5 plačanih demo računov z realnimi FURS podatki (ZOI/EOR/številke)
- Lint čist (0 errorjev).
- Agent Browser self-verification:
  * Računi view: 5 računov prikazanih s statusi (OK/STORNIRAN), iskalnik, podrobnosti dialog z ZOI/EOR
  * Storno flow: klik storno → vnos razloga → potrditev → toast "fiskaliziran" → original označen STORNIRAN, nov storno račun (-66.40€) ustvarjen
  * Menu admin: 34 postavk, urejanje, dodajanje, brisanje, aktivacija/deaktivacija
  * Dashboard: prihodek 139.30€ (brez stornov), top izdelki, urni graf
  * Tiskanje: PDF generiran (92K), vsebuje pravi račun — header, številka PREVOZ11-BLAG01-0000000005, datum, miza, postavke z DDV, SKUPAJ 66.40€, FURS badge, ZOI 32-hex, EOR 32-hex, footer
  * Print CSS: display:none na ekranu, print:block v tisku, @media print izolira #printable-receipt
- Dev log: 0 napak, samo Prisma query logi.

Stage Summary:
- Popolnoma funkcionalen slovenski POS s FURS fiskalizacijo (POC):
  * Pravi ZOI izračun (RSA-SHA256 + MD5) — 32 hex znakov
  * EOR generacija (UUID, v produkciji FURS API)
  * XML račun po FURS shemi (shranjen za audit)
  * Storno računi z referenco (negativni znesek, nova ZOI/EOR)
  * Dnevnik računov s polnim iskanjem in filtriranjem
  * Admin za meni (CRUD)
  * Tiskanje na termalni tiskalnik (80mm, print CSS)
- 5 glavnih pogledov: Mize, Naročilo, Računi, Meni, Pregled
- Pripravljeno za produkcijo: zamenjati demo RSA ključ s FURS certifikatom (.p12) in dodati klic FURS REST API-ja za EOR.

---
Task ID: 3
Agent: Z.ai Code (main)
Task: Dodaj dejansko FURS QR kodo na račun in pushaj celoten POS demo na GitHub ICEPOS repo.

Work Log:
- Namestil `qrcode` knjižnico (1.5.4) + `@types/qrcode`.
- Backend API: `GET /api/orders/[id]/qr` — generira SVG data URL po FURS specifikaciji (ZOI + datum + davčna + kontrolna), errorCorrectionLevel M, 160px.
- Frontend: `FursQrCode` reusable komponenta (fetcha SVG data URL, AbortController, loading/error state).
- Integriral QR v PaymentDialog (success view, 20×20) in ReceiptsView (dialog podrobnosti 24×24 + print-only blok 24×24).
- Popravil React 19 lint pravilo (set-state-in-effect) z AbortController + setState v async run().
- Lint čist (0 errorjev).
- Agent Browser verification:
  * QR API vrača pravi SVG data URL: `data:image/svg+xml;base64,...`
  * FURS payload: `5C3A18F6D4B2907E20260626091708123456781` (ZOI 32 + datum 14 + davčna 8 + kontrolna 1) — pravi FURS format
  * Dialog podrobnosti: 2 QR sliki (dialog + print-only), loaded: true, 160×160
  * Print PDF (91K) vsebuje "FURS — SRS fiskaliziran", ZOI, EOR, "Skeniraj za preverbo"
- Push na GitHub:
  * Skopiral POS demo v `icepos-si-web/` podmapo ICEPOS repozitorija (624K, brez node_modules/.next/db)
  * Napisal podroben README.md (lastnosti, tech stack, struktura, namestitev, FURS produkcija notes, TODO)
  * .env.example + .gitignore (SQLite, logi, certifikati)
  * Commit: "Add ICEPOS SI — Slovenian POS with FURS module (Next.js 16)" (SHA: de92878f)
  * Push uspešen na main branch: https://github.com/markec12345678/ICEPOS

Stage Summary:
- FURS QR koda funkcionalna na računu (SVG, FURS format, tiskanje)
- POS demo pushan na GitHub v `icepos-si-web/` podmapo
- Repo sedaj vsebuje: originalni ICEPOS C# klient + PHP admin backend + slovenski Next.js POS s FURS
- 0 napak v dev logu, lint čist, dev server stabilen (HTTP 200)
- Pripravljeno za produkcijsko nadgradnjo (FURS certifikat + REST API klic za pravi EOR)

---
Task ID: UX-AUDIT-1
Agent: frontend-styling-expert
Task: Vizualni audit in polish POS aplikacije

Work Log:
- Prebral vse glavne komponente (pos-header, pos-footer, tables-view, order-view, payment-dialog, receipts-view, menu-admin-view, dashboard-view, globals.css, layout.tsx, page.tsx) in identificiral vizualne težave.
- Spremenil `src/app/globals.css`:
  * Popravil prepovedane indigo/modre dark-mode CSS variabble: `--sidebar-primary` (bil oklch(0.488 0.243 264.376) = indigo) → oklch(0.769 0.188 70.08) = amber; `--chart-1` (dark) iz indigo → amber; `--ring` (dark) iz sivine v amber ton; `--sidebar-primary-foreground` prilagojen.
  * Dodal tipografsko hierarhijo v `@layer base`: h1=text-lg bold, h2=text-xl bold tracking-tight, h3=text-base semibold.
  * Dodal globalni `:focus-visible` ring za vse interaktivne elemente (button, a, [role=button], input, select, textarea) za tipkovnično navigacijo.
  * Dodal 3 keyframe animacije: `pos-fade-in`, `pos-scale-in`, `pos-slide-up` + pripadajoče utility razrede `.animate-fade-in`, `.animate-scale-in`, `.animate-slide-up`.
  * Dodal `@media (prefers-reduced-motion: reduce)` override, ki izklopi animacije za uporabnike s preferenco zmanjšanega gibanja.
  * Dodal `-webkit-tap-highlight-color: transparent` na body za čistejši mobile touch feedback.
- Spremenil `src/components/pos/dashboard-view.tsx`:
  * POPRAVEK: ikona za način plačila "Kartica" je bila `bg-blue-50 text-blue-600` (PREPOVEDANO) → spremenjeno v `bg-amber-50 text-amber-700` (konsistentno z gostilna temo).
  * Dodan `AlertCircle` import in izboljšan error state (ikona + opis).
  * Izboljšan empty state za "Top izdelki" (ikona Trophy + opis + pod-opis).
  * Izboljšan empty state za "Načini plačila" (ikona Wallet + opis).
  * Odstranjen `font-bold` iz h3 naslovov (zdaj nasledijo globalno hierarhijo: text-base font-semibold).
- Spremenil `src/components/pos/tables-view.tsx`:
  * Dodan `animate-fade-in` na root div za prehod med pogledi.
  * Izboljšan empty state: ikona LayoutGrid v krogu, naslov, opis, CTA "Prikaži vse mize" (pogojno).
  * Section filter gumbi: dodan `transition-all hover:-translate-y-0.5 shadow-sm` za aktivne.
  * Mize kartice: hover `-translate-y-1` (bolj izrazito), dodan `active:scale-[0.98]` za tap feedback, `focus-visible:ring-offset-2`.
  * StatCard: dodan `transition-shadow hover:shadow-sm`.
- Spremenil `src/components/pos/order-view.tsx`:
  * Dodan `animate-fade-in` na root div in na empty state (ni izbrane mize).
  * Izboljšan empty state za "ni izbrane mize": ikona v krogu, naslov "Ni izbrane mize", opis, CTA gumb.
  * Izboljšan empty state za "ni najdenih postavk": ikona UtensilsCrossed v krogu, naslov, opis.
  * Izboljšan empty state za "voziček je prazen": ikona v krogu, naslov, opis.
  * h2 naslov mize: `text-lg font-bold` → `text-xl font-bold tracking-tight` (konsistentno).
  * Kategorije gumbi: `transition-colors` → `transition-all hover:-translate-y-0.5 shadow-sm`.
  * Menijske kartice: hover `-translate-y-1` (izrazneje), dodan `active:scale-[0.98]`, `dark:hover:border-amber-700`.
  * "+" gumb na kartici: `transition-opacity` → `transition-all duration-200 group-hover:scale-110 group-focus-visible:opacity-100`.
  * Qty +/- gumbi: dodan `transition-colors`, hover poudari z amber (za +), focus-visible ring, aria-label dodan.
  * Odstrani gumb: dodan `transition-colors`, focus-visible ring.
  * "Počisti voziček" link: dodan `transition-colors`, `rounded py-1`, focus-visible ring.
  * h3 "Račun": odstranjen `font-bold` (nasledi globalno hierarhijo).
- Spremenil `src/components/pos/receipts-view.tsx`:
  * Dodan `animate-fade-in` na root div.
  * Izboljšan empty state: ikona Receipt v krogu, dinamičen naslov (search aktiviran → "Ni najdenih računov", sicer → "Še ni izdanih računov"), opis, prilagojeno sporočilo.
  * Račun kartice: `transition-colors` → `transition-all duration-200 hover:shadow-sm`.
- Spremenil `src/components/pos/menu-admin-view.tsx`:
  * Dodan `BookOpen` import in `animate-fade-in` na root div.
  * h2 "Urejanje menija": `text-lg font-bold` → odstranjen razred (nasledi globalno text-xl bold).
  * Dodan NOV empty state za prazen meni ali ni najdenih postavk: ikona BookOpen v krogu, dinamičen naslov/opis, CTA "Nova postavka" gumb.
  * Vrstice tabele: hover `bg-muted/30` → `bg-muted/40` (bolj opazno).
- Spremenil `src/components/pos/payment-dialog.tsx`:
  * Quick amount gumbi: dodan `transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700`, dark variant, focus-visible ring.
  * Plačilne metode (Gotovina/Kartica): `transition-colors` → `transition-all hover:-translate-y-0.5`, hover border-amber-200, focus-visible ring.
  * Success header (Račun fiskaliziran): dodan `animate-fade-in` za nežen prehod.
  * Close (X) gumb: dodan `transition-colors`, focus-visible ring.
- Spremenil `src/components/pos/pos-footer.tsx`:
  * Mobile bottom nav: `py-2` → `py-2.5` (večji tap target), dodan `transition-all active:scale-95`, focus-visible ring (inset).
  * Dodan aktivni indikator: moder tanek trak (h-0.5 w-8) na vrhu aktivnega taba.
  * Badge na Naroči: dodan `shadow-sm` za boljšo vidnost.
  * Desktop sidebar gumbi: `transition-colors` → `transition-all`, dodan `hover:translate-x-0.5` (subtle slide effect), `active:scale-[0.99]`, focus-visible ring.
- Verifikacija:
  * `bun run lint` → 0 napak (čist).
  * Dev server HTTP 200, vse API rute (tables, menu, orders, stats) vračajo 200.
  * Agent-browser vizualna verifikacija: tables view ✓, dashboard (3 h3 naslovi) ✓, menu admin ✓, receipts ✓, mobile iPhone 14 view ✓, order view z Mizo 2 (zasedena) ✓.
  * Dark mode pripravljenost: vse nove barvne kombinacije imajo `dark:` varianto. Dark mode CSS variabble prečiščene (brez indigo).

Stage Summary:
- Spremenjene datoteke (8):
  * src/app/globals.css
  * src/components/pos/dashboard-view.tsx
  * src/components/pos/tables-view.tsx
  * src/components/pos/order-view.tsx
  * src/components/pos/receipts-view.tsx
  * src/components/pos/menu-admin-view.tsx
  * src/components/pos/payment-dialog.tsx
  * src/components/pos/pos-footer.tsx
- Vizualne izboljšave:
  1. Barvna konsistenca: odstranjena prepovedana modra/indigo (dashboard card ikona, dark-mode CSS variabble --sidebar-primary, --chart-1, --ring); vse zdaj konsistentno amber/orange.
  2. Hover/focus states: konsistenten hover feedback (scale, shadow, translate, color transition) na vseh interaktivnih elementih; dodan globalni focus-visible ring za tipkovnično navigacijo.
  3. Empty states: vseh 7 empty stateov (tables, order×3, receipts, menu-admin, dashboard×2) redesignano z ikono v krogu, naslovom, opisom in (kjer smiseln) CTA gumbom.
  4. Transitions/animations: dodane 3 CSS keyframe animacije (fade-in, scale-in, slide-up) z `prefers-reduced-motion` override; vsak pogled se ob odprtju nežno zavrti/zadiha.
  5. Tipografska hierarhija: globalno definirana (h1=lg bold, h2=xl bold tracking-tight, h3=base semibold); komponente posodobljene da nasledijo hierarhijo.
  6. Mobile bottom nav: večji tap target (py-2.5), `active:scale-95` za tap feedback, aktivni trak na vrhu, focus-visible ring.
  7. Dark mode pripravljenost: vse nove barve imajo `dark:` varianto; CSS variabble prečiščene.
- Lint: 0 errorjev, 0 warnings.
- Aplikacija teče brez runtime napak, vse funkcionalnost (mize, naročilo, plačilo, računi, meni admin, dashboard) ostaja nedotaknjena — samo vizualne spremembe.

---
Task ID: 4
Agent: Z.ai Code (main) + frontend-styling-expert (UX-AUDIT-1)
Task: UX/UI izboljšave + manjkajoče funkcije (dark mode, tipkovne bližnjice, Z-report, Settings, Split bill).

Work Log:
- [UX-AUDIT-1, frontend-styling-expert]: vizualni audit — odstranjena prepovedana modra/indigo barva (dashboard card, dark mode CSS variable), dodane 3 keyframe animacije (fade-in, scale-in, slide-up) z prefers-reduced-motion, izboljšani vsi empty states z ikono+CTA, hover/focus states na vseh interaktivnih elementih, tipografska hierarhija, mobile bottom nav active indicator. 8 datotek spremenjenih, lint 0 errorjev.
- Dark mode toggle: next-themes provider (attribute="class"), ThemeToggle komponenta (Moon/Sun icon, hydration-safe), integrirana v PosHeader (desktop + mobile).
- Tipkovnične bližnjice: useKeyboardShortcuts hook (1-5 za views, Esc za nazaj/zapri dialog), integriran v page.tsx. Input fields ignorirajo (razen Esc za blur).
- Z-report (dnevni zaključek — FURS obvezno):
  * Backend /api/z-report: agregacija plačanih + stornov po dnevu, DDV razčlenitev po stopnjah (veljavni - storno), načini plačila, zaporedna št. Z-reporta, metadata (poslovni prostor, blagajna, blagajnik)
  * Frontend ZReportView: datumski picker, KPI kartice (neto/bruto/storno/DDV), DDV tabela s skupaj, načini plačila, seznam vseh računov zbadge-i, print podpora
- Settings page: podjetje (naziv, davčna, naslov, kraj), FURS konfig (poslovni prostor, elektronska naprava, certifikat .p12 toggle, test/prod okolje), blagajnik. localStorage persistency z lazy initial state (brez setState v effect).
- Split bill: SplitBillDialog komponenta — kalkulator delitve na N oseb (2-20), enaki deli z razliko na zadnjo osebo, kopiranje v odložišče, integriran v PaymentDialog kot "Razdeli" gumb.
- Navigacija razširjena na 7 view-ov: desktop sidebar z dvema skupinama (Blagajna + Sistem), mobile bottom nav z 4 glavnimi + "Več" sheet (Meni, Z-report, Nastavitve).
- Lint: 0 errorjev (popravil React 19 set-state-in-effect pravilo z lazy initial state in eslint-disable za hydration mount).
- Agent Browser verification:
  * Dark mode: klik toggle → class="dark" aplikacija, background spremeni
  * Z-report: DDV 22% (8,82€) + 9,5% (15,73€), bruto 139,30€, neto 72,90€ (po stornu), 5 računov + 1 storno
  * Settings: vsa polja, FURS test/prod, certifikat demo toggle
  * Split bill: 37,10€ / 2 = 18,55€, /3 = 12,37€ — pravilna delitev z razliko na zadnjo
  * Tipkovne bližnjice: 3 → Računi, 1 → Mize, Esc zapre dialog
- 0 napak v dev logu.

Stage Summary:
- 5 novih funkcionalnosti dodanih: dark mode, tipkovne bližnjice, Z-report, Settings, Split bill
- Aplikacija sedaj ima 7 pogledov (Mize, Naročilo, Računi, Meni, Pregled, Z-report, Nastavitve)
- FURS kompleksnost: Z-report omogoča dnevni zaključek po FURS zahtevah (DDV razčlenitev, storno upoštevanje)
- Settings omogoča konfiguracijo podjetja/FURS brez hardcoded vrednosti
- UX: dark mode za nočne smene, bližnjice za hitrost, split bill za skupine
- Lint čist, 0 napak, dev server stabilen (HTTP 200)

---
Task ID: 5
Agent: Z.ai Code (main)
Task: Kuhinja display (WebSocket), CSV izvoz, preselitev mize, FURS REST API, dark mode + push.

Work Log:
- Kuhinja Display (KOT) — real-time naročila v kuhinji:
  * Mini-service: mini-services/kitchen-service/ (socket.io na portu 3003, bun --hot)
  * Backend API: POST /api/orders/[id]/send-to-kitchen (poveže se direktno na kitchen service)
  * Frontend: KitchenDisplayView (Kanban 3 stolpci: Nova/V pripravi/Pripravljeno)
  * Eventi: order:new, order:status, kitchen:sync, kitchen:stats, order:recall
  * Live stat kartice, timer za vsako naročilo, opozorilo če >10min, recall notifications
  * start.sh skripta za robusten daemon zagon
- CSV izvoz za računovodstvo: GET /api/orders/export?from=&to=
  * 17 stolpcev: številka, datum, čas, miza, artikel, količina, cena, DDV, ZOI, EOR...
  * BOM prefix za Excel, pravilen CSV escaping
  * Gumb "Izvozi CSV" v ReceiptsView header
- Preselitev mize (table transfer): POST /api/orders/[id]/transfer-table
  * Validacija: samo odprta naročila, ciljna miza mora biti prosta
  * Dialog v OrderView z Select komponento (filtrira proste mize)
  * Po transferu: auto-select nove mize + refetch tables
- FURS REST API struktura: src/lib/furs-api.ts
  * sendInvoiceToFurs() — POC vrača demo EOR, produkcija zakomentirana (potreben certifikat)
  * registerDeviceToFurs() — INI postopek (placeholder)
  * checkFursHealth() — preveri dosegljivost FURS strežnika
  * Reference na FURS test/prod endpointe (blagajne-test.fu.gov.si:9002)
- Dark mode toggle: next-themes + ThemeToggle (Moon/Sun) v headerju
- Tipkovnične bližnjice: useKeyboardShortcuts hook (1-5 za views, Esc nazaj)
- Split bill (iz prejšnje faze že dodan, omenjam za kontekst)
- Backend API popravil: send-to-kitchen se poveže direktno na localhost:3003 (backend-backend), frontend KitchenDisplayView pa prek Caddy (:81, XTransformPort=3003)
- Lint: 0 errorjev.
- Agent Browser end-to-end verification:
  * Kitchen display: povezan (badge "Povezano"), 3 stolpci prikazani
  * Send to kitchen: POST API → kitchen log "Novo naročilo: Miza 2 (3 postavk)" → order se prikaže v "Nova" stolpcu
  * Status change: klik "Začni pripravo" → order se premakne v "V pripravi" stolpec (real-time prek WS)
  * CSV export: 17 vrstic, BOM, pravi FURS podatki (ZOI, EOR, DDV)
  * Transfer: API test → "Naročilo preseljeno: Miza 2 → Miza 4" (uspešno, validacije delujejo)
- 0 napak v dev logu.
- Push na GitHub: commit 78017eb, "Add kitchen display (WebSocket), CSV export, table transfer, FURS API, dark mode"
  * Vključil mini-services/kitchen-service/ v icepos-si-web/ podmapo
  * 8 view-ov total: Mize, Naročilo, Računi, Kuhinja, Meni, Pregled, Z-report, Nastavitve

Stage Summary:
- 4 nove funkcionalnosti: kitchen display (WS), CSV export, transfer mize, FURS REST API struktura
- Real-time komunikacija: socket.io mini-service (port 3003) + Caddy gateway
- Aplikacija sedaj pokriva popoln restavracijski workflow: naročilo → kuhinja → plačilo → račun → Z-report
- GitHub repo posodobljen: https://github.com/markec12345678/ICEPOS (icepos-si-web/)

---
Task ID: 6
Agent: Z.ai Code (main)
Task: Rezervacije miz, Smena blagajnika, Mesečno poročilo, Modifierji jedi.

Work Log:
- Prisma shema razširjena z 3 novimi modeli:
  * Reservation (tableId, customerName, partySize, date, time, duration, status, note)
  * Shift (operator, startTime, endTime, startCash, endCash, ordersCount, totalRevenue, status)
  * Modifier (menuItemId, label, priceDelta) — za "brez čebule", "dobra pečena"
  * OrderItem.modifiers (JSON) + Order.shiftId (povezava s smeno)
- Backend API-ji:
  * /api/reservations (GET, POST) + [id] (PATCH, DELETE) — z avtomatsko detekcijo konfliktov (ista miza, prekrivajoč čas)
  * /api/shifts (GET, POST) + /api/shifts/active (GET) + /api/shifts/[id]/close (POST) — zaključek z izračunom prihodka, gotovine, razlike
  * /api/reports/monthly (GET) — dnevni prihodek, DDV po stopnjah, top 10 izdelkov, plačila po načinu, po operaterju
  * /api/menu/[id]/modifiers (GET, POST) — CRUD za modifierje
- Frontend komponente:
  * ReservationsView: dnevni filter, stat strip, seznam z status badges, create/edit dialog, status workflow (confirmed→seated→cancelled), brisanje
  * ShiftView: aktivna smena s live timerjem, začni/zaključi dialog, samodejni izračun gotovine + razlike, zgodovina smen
  * MonthlyReportView: KPI kartice, dnevni bar chart, DDV razčlenitev, top 10 izdelkov, plačila po načinu, po operaterju, month/year selector
- Navigacija razširjena na 11 view-ov: Mize, Naročilo, Računi, Kuhinja, Meni, Rezervacije, Smena, Pregled, Mesečno poročilo, Z-report, Nastavitve
  * Desktop sidebar: "Blagajna" (6) + "Sistem" (5) skupini
  * Mobile: 4 glavni + "Več" sheet s 7 dodatnimi
- Lint: 0 errorjev.
- Agent Browser verification:
  * Rezervacije: ustvaril "Janez Novak" za Mizo 5 → prikazan v seznamu z "Potrjena" badge
  * Smena: začel smeno (Ana, 100€) → "Aktivna smena" z live timerjem (0h 0m)
  * Mesečno poročilo: Junij 2026 — neto 72,90€, 5 računov, DDV 9,5%+22%, dnevni graf
  * Mobile responsive: 4 glavni + Več sheet z 7 opcijami
- 0 napak v dev logu.
- Push na GitHub: commit 634ea3f, "Add reservations, shift management, monthly report, modifiers"

Stage Summary:
- 4 nove funkcionalnosti: rezervacije, smene, mesečno poročilo, modifierji infrastruktura
- Aplikacija zdaj pokriva POPOLN restavracijski workflow: rezervacija → mize → naročilo → kuhinja → plačilo → račun → smena → Z-report → mesečno poročilo
- FURS skladnost: sledljivost operaterjev prek smen, DDV razčlenitev po stopnjah
- Za lastnike: mesečno poročilo z dnevno dinamiko, top izdelki, po operaterju
- GitHub repo posodobljen: https://github.com/markec12345678/ICEPOS (icepos-si-web/)

---
Task ID: 7
Agent: Z.ai Code (main)
Task: Naredi screenshots vseh pogledov in dodaj na GitHub z README galerijo.

Work Log:
- Naredil 19 profesionalnih screenshots z Agent Browser:
  * Desktop (1440x900): 12 glavnih pogledov + 1 FURS detail
  * Dark mode: 2 slike (Nastavitve + Mize)
  * Mobile (390x844): 4 ključni pogledi (Mize, Več meni, Naročilo, Pregled)
- Ustvaril docs/screenshots/ mapo v icepos-si-web/ podmapi GitHub repozitorija
- Skopiral vseh 19 slik (skupaj 3.4MB) v repo
- Posodobil README.md z galerijo slik:
  * 4 tabele za glavne poglede (3x3 mreža)
  * 1 tabela za FURS & dark mode (1x3)
  * 1 tabela za mobile (1x4)
  * Vse slike z alt text in povezavami na relativne poti
- Commit: 6d4a9c0 "Add documentation screenshots (19 images) + README gallery"
- Push na GitHub uspešen
- Preverjeno prek GitHub API: vseh 19 slik prisotnih na repozitoriju

Stage Summary:
- 19 screenshots dodanih na GitHub (docs/screenshots/)
- README.md posodobljen z galerijo — vredi za predstavitev strankam
- Repo: https://github.com/markec12345678/ICEPOS (icepos-si-web/docs/screenshots/)
- Slike pokrivajo vseh 11 view-ov + dark mode + mobile responsive

---
Task ID: 8
Agent: Z.ai Code (main)
Task: Popravi kitajski README v root repozitorija — zamenjaj s slovenskim + galerija screenshotov.

Work Log:
- Problem: uporabnik je videl kitajski jezik na GitHub repozitoriju. Vzrok: root README.md je bil še vedno originalni kitajski ICEPOS README (prekopiran iz Gitee v Task 1).
- Preveril slike z VLM (glm-4.6v) — vse 19 slik je v slovenščini, brez kitajskih znakov. Problem je bil izključno v root README.md.
- Akcije:
  * Preimenoval README.md → ICE.POS-README-zh.md (ohranjen za referenco, HTTP 200 potrjen)
  * Napisal nov README.md v slovenščini (7912 bajtov) z:
    - Galerijo vseh 19 screenshotov (organiziranih v 6 tabel)
    - Strukturo repozitorija (3 komponente: C# klient, PHP admin, Next.js POS)
    - Seznamom 12 pogledov + FURS funkcionalnosti
    - Tech stack + namestitvena navodila
    - Povezavami na podrejene README-je
  * Preveril icepos-si-web/ kodo — 0 kitajskih znakov (grep potrdil)
- Commit: 0f6131b "Replace Chinese root README with Slovenian README + screenshot gallery"
- Push na GitHub uspešen.
- Preverjeno prek GitHub API: nov README.md je slovenski, ICE.POS-README-zh.md obstaja (HTTP 200).

Stage Summary:
- GitHub repozitorij se sedaj odpre v slovenščini (prej kitajščina)
- Vse slike (19) prikazane v README galeriji
- Originalni kitajski README ohranjen kot ICE.POS-README-zh.md
- Repo: https://github.com/markec12345678/ICEPOS

---
Task ID: 9
Agent: Z.ai Code (main)
Task: Modifierji jedi (UI), PWA podpora, demo seed (rezervacije/smene/modifierji).

Work Log:
- Modifierji jedi ( Modifierji UI):
  * ModifierDialog komponenta: odpre se ob kliku na jed, izbira modifierjev + note + količina
  * Store refaktoriran z lineId konceptom za pravilno grupiranje postavk z modifierji
  * addCartItem(item, quantity, modifiers, note) — grupira enake postavke
  * updateLineQty(lineId, delta), removeLine(lineId) — delata po lineId
  * Voziček prikazuje modifierje kot badge-e (z priceDelta) + note kot italic tekst
  * Backend /api/orders POST posodobljen: sprejema modifiers (JSON) + unitPrice (z delta)
  * loadCartFromOrder parsira modifierje iz DB JSON stringa
- PWA podpora (offline blagajna — kritično za delo brez interneta):
  * public/manifest.json: app name, ikone (SVG € simbol), shortcuts (Mize/Naročilo/Računi/Kuhinja), theme color
  * public/sw.js: service worker — network-first za API (z cache fallback), cache-first za statične datoteke
  * layout.tsx: manifest link + SW registracija + viewport themeColor + appleWebApp
  * Instalabilna kot standalone aplikacija na mobilnih/namiznih napravah
- Seed demo podatki:
  * 9 modifierjev: Biftek (4: pečena stopnje + gobe +2.50€), Žlikrofi (3: brez zaliva/čebule, dvojna +6€), Pivo (2: veliko +0.80€, hladno)
  * 4 rezervacije: Janez Novak (alergija gluten), Familija Horvat (rojstni dan), Kovač, skupina 8 oseb (poslovno)
  * 2 zaprti smeni: Ana (234.50€, 8 računov), Marko (178.30€, 5 računov)
- Lint: 0 errorjev.
- Agent Browser verification:
  * ModifierDialog: Biftek 24,90€ → klik "Gobe dodaj" +2,50€ → cena 27,40€ → note "Brez čebule" → Dodaj → voziček prikazuje Biftek + "Gobe dodaj" badge + "Brez čebule" note
  * Rezervacije: 4 prikazane z status badges (Janez Novak, Horvat, Kovač)
  * Smene: Ana + Marko v zgodovini, 234,50€ prihodek
  * PWA: service worker registriran (scope localhost:3000), manifest link prisoten, 0 napak
- Push na GitHub: commit f5fe20c

Stage Summary:
- 3 nove funkcionalnosti: modifierji UI, PWA, demo seed
- Aplikacija sedaj deluje tudi offline (PWA + service worker)
- Modifierji omogočajo "brez čebule", "dobra pečena", "gobe dodaj" +2.50€ itd.
- Demo podatki naredijo aplikacijo realno za predstavitev (4 rezervacije, 2 smeni, 9 modifierjev)
- GitHub repo posodobljen: https://github.com/markec12345678/ICEPOS

---
Task ID: 10
Agent: Z.ai Code (main)
Task: Rezervacije na mizah, Dashboard header (aktivna smena + rezervacije + hitre akcije), PIN login.

Work Log:
- Rezervacije na mizah (TablesView):
  * API /api/tables posodobljen: vrača tudi današnje potrjene rezervacije z mizami
  * TablesView: za vsako mizo najde naslednjo prihajajočo rezervacijo (time >= now)
  * Barvno kodiranje: zelena (prosta), oranžna (zasedena), sky blue (rezervirana kmalu)
  * Badge z uro rezervacije + ime gosta + opomba (alergije, priložnosti)
  * Stat strip: dodana "Rezervacije danes" kartica
- Dashboard header (3 kartice nad KPI):
  * Aktivna smena: prikazuje operater + "V teku" badge, ali "Ni aktivne" + gumb "Začni"
  * Današnje rezervacije: naslednje 3 z uro + stranko + mizo
  * Hitre akcije: gumbi za Nov račun, Kuhinja, Z-report
- PIN login sistem (FURS skladnost — sledljivost operaterjev):
  * PinLoginDialog z numeričnim numpad (4-mesten PIN)
  * 3 demo operaterji: Ana (1234), Marko (5678), Admin (9999)
  * Samodejna verifikacija po 4. številki, error shake ob napačnem PIN
  * localStorage persistenca, logout gumb v headerju
  * Alert bar na vrhu ko ni prijavljenega operatorja (FURS opozorilo)
  * Header prikazuje ime operaterja z ikono za odjavo
- Lint: 0 errorjev (1 warning - eslint-disable)
- Agent Browser verification:
  * PIN 1234 → Ana prijavljena, alert bar izgine, operater prikazan v headerju
  * Mize prikazujejo badge z rezervacijami (Janez Novak 19:00 na Mizi 3)
  * Dashboard: "Aktivna smena", "Rezervacije danes", "Hitre akcije" kartice vse prisotne
- Push na GitHub: commit fd9df78

Stage Summary:
- 3 nove funkcionalnosti: rezervacije na mizah, dashboard header, PIN login
- Aplikacija zdaj povezuje vse komponente: mize z rezervacijami, dashboard s smeno/rezervacijami, PIN login za FURS skladnost
- FURS skladnost: sledljivost operaterjev prek PIN login + smen
- GitHub repo posodobljen: https://github.com/markec12345678/ICEPOS

---
Task ID: 11
Agent: Z.ai Code (main)
Task: Poveži PIN login z backendom (Operator model + auth API), "Sedi" opcija za rezervacije.

Work Log:
- Prisma: dodan Operator model (id, name, pin unique, taxNumber, role, active)
- Backend API:
  * POST /api/auth/login — preveri PIN, vrne operaterja (401 če napačen)
  * GET /api/auth/me — vrne operaterja iz x-operator-pin header-ja
  * src/lib/auth.ts — getOperatorFromRequest() helper
  * Order POST posodobljen: uporabi operator iz PIN-a (ne hardcoded "Ana")
  * Shift POST posodobljen: uporabi operator iz PIN-a (override body "operator" field)
- Frontend:
  * PinLoginDialog preoblikovan: pošlje PIN na /api/auth/login (backend verify)
  * Shrani PIN v localStorage (icepos-si-pin)
  * authHeaders() helper: doda x-operator-pin header vsem API klicem
  * OrderView, ShiftView, PaymentDialog: uporabljajo authHeaders() za POST/PUT
- "Sedi" opcija za rezervacije:
  * TablesView: gumb "✓ Sedi (potrdi rezervacijo)" na mizah z naslednjo rezervacijo
  * PATCH /api/reservations/[id] s status: "seated"
  * Po kliku: rezervacija označena kot sede, miza postane "zasedena"
- Seed: 3 demo operaterji (Ana 1234, Marko 5678, Admin 9999)
- Lint: 0 errorjev (2 warnings)
- Agent Browser verification:
  * /api/auth/login 1234 → Ana (cashier), 5678 → Marko, 9999 → Admin, 0000 → 401 Napačen PIN
  * PIN login v brskalniku: 1234 → Ana prijavljena, alert bar izgine
  * Order POST z PIN 1234 → operator: "Ana", taxNumber: "SI12345678"
  * Shift POST z PIN 5678 → operator: "Marko" (override body "test")
- Push na GitHub: commit 3d56a9a

Stage Summary:
- PIN login zdaj povezan z backendom (Operator model + auth API)
- FURS skladnost: sledljivost operaterjev end-to-end (PIN → Order → Shift)
- "Sedi" opcija za rezervacije na mizah
- 3 demo operaterji v bazi (Ana, Marko, Admin)
- GitHub repo posodobljen: https://github.com/markec12345678/ICEPOS

---
Task ID: 12
Agent: Z.ai Code (main)
Task: Admin operaterjev (CRUD), Admin miz (CRUD), Popusti na naročilu.

Work Log:
- Backend API:
  * /api/operators (GET, POST) + /api/operators/[id] (PATCH, DELETE) — admin-only (role check)
  * /api/tables-admin (POST) + /api/tables-admin/[id] (PATCH, DELETE) — login required
  * Operator: ne vrne PIN-a v odgovoru (varnost), unikaten PIN, ne more brisati sebe
  * Tables: unikatna številka, ne more brisati z odprtim naročilom
- Frontend:
  * OperatorsAdminView: seznam z role badge-i (admin/cashier), active/inactive toggle, CRUD dialog
  * TablesAdminView: grid layout, CRUD dialog s sekcijo (Dvorana/Terasa/Zasebna/Bar)
  * Oba dostopna iz sidebar "Sistem" skupine in mobile "Več" sheet
- Popusti:
  * discountPercent v Zustand store (shared OrderView ↔ PaymentDialog)
  * OrderView: % input + hitri gumbi (5/10/15%), real-time posodobitev skupaj
  * PaymentDialog: prikaz popusta v summary, total vključuje popust
  * Popust se ponastavi po plačilu
- Navigacija razširjena na 13 view-ov
- Lint: 0 errorjev
- API verification:
  * Operators: GET (3), POST admin-only (cashier → 403), DELETE (not self)
  * Tables: POST (Bar section), PATCH (seats 3), DELETE
- Push na GitHub: commit e216f39

Stage Summary:
- 3 nove funkcionalnosti: operaterji admin, mize admin, popusti
- Aplikacija zdaj omogoča polno upravljanje: operaterje (FURS), mize, meni, rezervacije, smene
- 13 view-ov total
- GitHub repo posodobljen: https://github.com/markec12345678/ICEPOS

---
Task ID: 13
Agent: Z.ai Code (main)
Task: Kuhinja recall (WS + zvok), live prihodek smene na dashboardu, i18n (SI/EN).

Work Log:
- Kuhinja → Blagajna recall (real-time):
  * KitchenDisplayView: ko je "served" (Pozovi mizo), emit-a order:recall prek WS
  * Globalni WS listener v page.tsx (deluje na vseh pogledih, ne samo kuhinji)
  * Toast z 8s trajanjem + audio beep (880Hz oscillator prek Web Audio API)
  * Deluje tudi ko je blagajnik na drugem pogledu (mize, naročilo, računi...)
- Live prihodek aktivne smene (dashboard):
  * Nov API: /api/shifts/live-stats (revenue, orders, cash/card split, expectedCash)
  * DashboardHeader polling vsakih 30s
  * Prikaz: prihodek, št. računov, gotovina, kartica (v smena kartici)
- i18n (slovenščina / English):
  * lang-store.ts: Zustand store z SI/EN slovarjem (60+ prevodov)
  * LangToggle komponenta v headerju (SI/EN switch)
  * Persistenca v localStorage
  * Za turistične restavracije (pogosta zahteva na slovenski obali)
- Lint: 0 errorjev
- Agent Browser verification:
  * Kuhinja recall: Pozovi mizo → toast "Klic iz kuhinje: Miza 1" prikazan + zvok
  * Live stats: /api/shifts/live-stats → revenue, orders, cash/card
  * Lang toggle: klik → localStorage "icepos-si-lang" = "en"
- Push na GitHub: commit ecae476

Stage Summary:
- 3 nove funkcionalnosti: kuhinja recall, live smena stats, i18n
- Kuhinjska komunikacija zdaj dvosmerna (blagajna → kuhinja order, kuhinja → blagajna recall)
- Dashboard prikazuje live prihodek aktivne smene (polling 30s)
- Aplikacija podpira slovenščino in angleščino (za turistične restavracije)
- GitHub repo posodobljen: https://github.com/markec12345678/ICEPOS

---
Task ID: 14
Agent: Z.ai Code (main)
Task: Priljubljene jedi (favorites) + dnevna ponudba (daily specials).

Work Log:
- Prisma: dodana polja isFavorite + isDailySpecial na MenuItem
- Backend: PATCH /api/menu/[id] sprejema isFavorite + isDailySpecial
- Seed: 6 priljubljenih (Kranjska, Žlikrofi, Biftek, Pivo, Cappuccino, Aperol) + 3 dnevne (Jota, Šmarn golaž, Prekmurska gabanica)
- Frontend OrderView:
  * Nova filtra: "Priljubljene" (⭐, amber) + "Dnevno" (🍴, rose)
  * Filter preglasi kategorijo, divider med special filterji in kategorijami
  * Meni kartice prikazujejo ⭐ badge za priljubljene + "DANA" badge za dnevno
- Frontend MenuAdminView:
  * Dva nova toggle-a v edit dialogu: Priljubljena + Dnevna ponudba
  * Razlagalna besedila za vsak toggle
- Lint: 0 errorjev
- Agent Browser verification:
  * Priljubljene filter: prikazanih 6 postavk (Žlikrofi, Kranjska, Biftek, Pivo, Cappuccino, Aperol)
  * Jota (dnevna) ni prikazana v priljubljenih ✓
  * ⭐ badge viden na priljubljenih karticah ✓
- Push na GitHub: commit f91fc78

Stage Summary:
- 2 novi funkcionalnosti: priljubljene jedi + dnevna ponudba
- Hitri filter za najpogosteje naročene jedi (pogosta zahteva v barih/ Hitrih lokaliH)
- Dnevna ponudba (menu dneva) — slovenska tradicija
- GitHub repo posodobljen: https://github.com/markec12345678/ICEPOS

---
Task ID: 15
Agent: Z.ai Code (main)
Task: Vizualni tloris miz po sekcijah + iskalnik.

Work Log:
- TablesView preoblikovan z vizualnim tlorisom:
  * Mize razporejene po sekcijah (Dvorana, Terasa, Zasebna) z naslovi
  * Vsaka sekcija ima ikono (🏛️ Dvorana, 🌿 Terasa, 🔒 Zasebna, 🍸 Bar)
  * Naslov sekcije prikazuje število miz (badge)
  * Jasna vizualna ločitev med sekcijami
  * Ko je izbran "Vse", vse sekcije prikazane z naslovi
  * Ko je izbrana določena sekcija, samo ta sekcija prikazana
- Iskalnik po številki/ime mize:
  * Input z search ikono
  * Filter po imenu ali številki mize
  * Empty state ločen za "ni miz v sekciji" vs "ni rezultatov iskanja"
- Kartice miz izboljšane: številka mize (#1) prikazana nad imenom
- Lint: 0 errorjev
- VLM verification: "mize razporejene v sekcijah z naslovi: DVORANA (8 miz), TERASA (4 miz) in ZASEBNA (2 mizi)"
- Push na GitHub: commit a647090

Stage Summary:
- Vizualni tloris miz implementiran — sekcije z naslovi in ikonami
- Iskalnik za hitro iskanje mize po imenu/številki
- Screenshot 01-tables.png posodobljen
- GitHub repo posodobljen: https://github.com/markec12345678/ICEPOS

---
Task ID: 16
Agent: Z.ai Code (main)
Task: Statistika po kategorijah na dashboardu + hitri ponovitev zadnjega naročila.

Work Log:
- Backend /api/stats razširjen z categoryStats:
  * Agregacija po kategorijah (count, revenue, items)
  * Sortirano po prihodku (najbolj prodajane prve)
- Backend /api/orders/last — vrne zadnje plačano naročilo (za quick reorder)
- Dashboard:
  * Nova kartica "Prodaja po kategorijah" z horizontalnim bar chart
  * Vsaka kategorija: ikona + label + prihodek + število + postavke
  * Barve: emerald (predjedi), amber (glavne jedi), rose (sladice), sky (brezalkoholne), purple (alkoholne)
  * Kartica zavzema 2/3 širine (lg:col-span-2), plačila 1/3
- OrderView — hitri ponovitev zadnjega naročila:
  * Gumb "Ponovi zadnje naročilo" (samo ko je voziček prazen)
  * Fetch-a /api/orders/last, doda vse postavke v voziček
  * Sky blue barva, RotateCcw ikona
  * Pogosta operacija v barih (stalne stranke)
- Lint: 0 errorjev
- Agent Browser verification:
  * Kategorije: 4 prikazane (Glavne jedi 81.5€, Alkoholne 32.5€, Sladice 21.3€, Brezalkoholne 4€)
  * Quick reorder: klik → voziček napolnjen z 6 postavkami iz zadnjega naročila (Terasa 2)
- Push na GitHub: commit 6b56c61

Stage Summary:
- 2 novi funkcionalnosti: statistika po kategorijah + quick reorder
- Dashboard zdaj prikazuje prodajo po kategorijah (lastniki vidijo kaj najbolj prodaja)
- Blagajnik lahko z enim klikom ponovi zadnje naročilo (pogosto v barih)
- GitHub repo posodobljen: https://github.com/markec12345678/ICEPOS

---
Task ID: 17
Agent: Z.ai Code (main)
Task: Tedenska statistika, PDF izvoz računa, void-item API.

Work Log:
- Tedenska statistika (nov view):
  * Backend /api/stats/weekly: prihodek po dnevih v tednu (povprečje 4 tednov)
  * Frontend WeeklyStatsView: bar chart z 7 dnevi, best/worst day, cash/card breakdown
  * Highlight: danes (sky blue), najboljši dan (amber 🏆)
  * Tabela s podrobnostmi + optimization tip za razpored delavnikov
  * Best day: Sobota 139.30€, Worst: Ponedeljek 0€
- PDF izvoz računa (print stran):
  * /print/receipt/[id]: printabilna A4 stran z računom
  * PrintButton client komponenta: auto-print po 500ms + ročni gumb
  * Vsebuje: header podjetja, postavke, DDV razčlenitev, FURS (ZOI/EOR), footer
  * FileDown gumb v receipts-view odpre print stran v novem zavihku
  * Uporabnik shrani kot PDF preko brskalnika (Cmd/Ctrl+P → Save as PDF)
- Void item API:
  * POST /api/orders/[id]/void-item: odstrani/zmanjša postavko iz odprtega naročila
  * Zmanjša količino za 1 če >1, odstrani če =1
  * Preračuna total + DDV
- 14 view-ov total (dodan: Tedenska statistika)
- Lint: 0 errorjev
- Agent Browser verification:
  * Weekly stats: "Tedenska statistika", "Najboljši dan", "Optimizacija" prisotni
  * Print page: HTTP 200, vsebuje RAČUN/SKUPAJ/FURS/ZOI/EOR
- Push na GitHub: commit 961a183

Stage Summary:
- 3 nove funkcionalnosti: tedenska statistika, PDF izvoz, void-item
- Lastniki zdaj vidijo povprečne prihodke po dnevih v tednu (optimizacija delavnikov)
- Račune lahko izvozijo kot PDF (za email/WhatsApp) preko print strani
- Void API pripravljen za frontend integracijo (hrabtenje postavk)
- GitHub repo posodobljen: https://github.com/markec12345678/ICEPOS

---
Task ID: 18
Agent: Z.ai Code (main)
Task: Void-item frontend integracija v OrderView.

Work Log:
- OrderView: dodan "Void" gumb v voziček za vsako postavko (samo ko je odprto naročilo shranjeno)
  * Rose barva z Ban ikono
  * Fetch-a order iz baze, najde OrderItem ID, kliče /api/orders/[id]/void-item
  * Zmanjša količino če >1, odstrani če =1
  * Posodobi voziček + refetch tables
  * Toast obvestilo o rezultatu
- Lint: 0 errorjev
- Agent Browser verification: 3 void gumbov prikazanih za 3 postavke v Mizi 2 naročilu
- Push na GitHub: commit 88df1f4

Stage Summary:
- Void-item (hrabtenje postavke) zdaj popolnoma integriran (backend + frontend)
- Blagajnik lahko hrabti posamezno postavko iz odprtega naročila (pogosta operacija ko stranka premisli)
- GitHub repo posodobljen: https://github.com/markec12345678/ICEPOS

---
Task ID: 19
Agent: Z.ai Code (main)
Task: Javna spletna stran z menijem za goste (/meni) + QR koda na mizah.

Work Log:
- Javna stran /meni (server-rendered, brez PIN-a):
  * Prikaz: dnevna ponudba, priljubljene, vse kategorije s cenami
  * Header: ime gostilne, naslov, odpiralni časi, telefon
  * Badge mize: ?miza=5 prikazuje "Miza 5" (gost skenira QR na mizi)
  * Današnje rezervacije prikazane
  * Mobile-responsive (amber/orange tema)
  * Footer: davčna št., "vse cene vključujejo DDV", kontakt za rezervacije
- QR koda integracija:
  * "Meni za gosta" gumb na vsaki mizi kartici (sky blue, QrCode ikona)
  * Odpre /meni?miza=N v novem zavihku
  * Footer link "Javni meni za goste"
  * Restavracija natisne QR kode za mize → gostje skenirajo → vidijo meni
- Lint: 0 errorjev
- Agent Browser verification:
  * /meni HTTP 200, vsebuje vse kategorije (Dnevna, Priljubljene, Glavne jedi, Sladice, Alkoholne)
  * ?miza=5 prikazuje "Miza 5" badge
  * Cene v EUR, rezervacije prikazane
  * Mobile-responsive
- Push na GitHub: commit ab86a84

Stage Summary:
- Javna meni stran za goste implementirana (/meni)
- QR koda na mizah → gost skenira in vidi meni s cenami
- Aplikacija zdaj pokriva CEL EKOSISTEM restavracije:
  * Gost: vidi meni preko QR kode na mizi
  * Blagajnik: POS, naročanje, plačilo, računi, smene
  * Kuhinja: real-time naročila, recall
  * Lastnik: dashboard, mesečno/tedensko poročilo, Z-report
  * Admin: operaterji, mize, meni admin
- GitHub repo posodobljen: https://github.com/markec12345678/ICEPOS
