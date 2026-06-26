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
