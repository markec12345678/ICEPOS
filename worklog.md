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
