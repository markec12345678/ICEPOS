# 🤝 Prispevanje — Gostilna POS

Hvala, da želiš prispevati k **Gostilna POS**! 🎉 Ta dokument pojasnjuje proces.

---

## 🚀 Preden začneš

1. **Preglej [issues](https://github.com/markec12345678/ICEPOS/issues)** — morda že obstaja diskusija o tvoji ideji.
2. **Odpri nov issue** za večje spremembe (nova funkcija, refaktor), da preprečimo dupliciranje dela.

---

## 🛠️ Lokalni setup

```bash
git clone https://github.com/markec12345678/ICEPOS.git
cd ICEPOS
bun install
cp .env.example .env
bun run db:push
bun run db:seed
bun run dev          # http://localhost:3000
```

Za kuhinjo (real-time):
```bash
cd mini-services/kitchen-service
bun install
bun run dev          # port 3003
```

---

## 📋 Konvencije

### Koda
- **TypeScript** povsod (strict mode)
- **Functional components** + React Hooks
- **shadcn/ui** komponente (ne piši custom UI, če obstaja shadcn alternativa)
- **Tailwind CSS 4** za styling (uporabljaj `bg-primary`, `text-foreground` itd.)
- **`'use client'`** na vrhu datoteke za client komponente
- **`'use server'`** za server actions (čeprav preferiramo API routes)
- **API routes** (App Router) za backend logiko, NE server actions

### Prisma
- Schema v `prisma/schema.prisma`
- Po spremembi: `bun run db:push` (development)
- Primitivni tipi samo (NO list primitivov — uporabi JSON string)
- Seed: `prisma/seed.ts`

### File structure
- `src/app/api/` — REST API routes
- `src/components/pos/` — POS komponente
- `src/components/ui/` — shadcn/ui (NE spreminjaj ročno, razen če nujno)
- `src/lib/` — utility, FURS, auth, db
- `src/stores/` — Zustand stores
- `src/hooks/` — custom hooks
- `mini-services/` — WebSocket / sidecar services

### Jezik
- **Slovenščina** za UI nize, komentarji, commit sporočila
- **Angleščina** za tehnične termine kjer je standard (npr. "shift", "dashboard", "PIN")
- Komentarji v kodi: slovensko (razumljivo za slovenske razvijalce)

### Naming
- **Datoteke**: `kebab-case.tsx` (npr. `payment-dialog.tsx`)
- **Komponente**: `PascalCase` (npr. `PaymentDialog`)
- **Funkcije/spremenljivke**: `camelCase`
- **Konstante**: `UPPER_SNAKE_CASE`
- **Tipi/Interface**: `PascalCase`

---

## 🔀 Workflow (PR proces)

1. **Fork** repozitorija (ali delaš na branchu v originalu)
2. **Ustvari branch**:
   ```bash
   git checkout -b feature/moja-nova-funkcija
   # ali
   git checkout -b fix/popravek-buga
   ```
3. **Piši male, fokusirane commite** z jasnimi sporočili:
   ```bash
   git commit -m "feat: dodana možnost delitve računa med 4 osebe"
   git commit -m "fix: pravilen izračun DDV pri popustu na celoten račun"
   git commit -m "docs: posodobljen README z navodili za Docker"
   ```
   Uporabljaj [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` nova funkcija
   - `fix:` popravljena napaka
   - `docs:` dokumentacija
   - `refactor:` refactor brez spremembe funkcionalnosti
   - `test:` testi (z vitest (unit) in playwright (e2e) — glej tests/)
   - `chore:` vzdrževalni commit

4. **Preveri kodo**:
   ```bash
   bun run lint
   ```
   Mora biti **0 errorjev**. Warnings so dovoljeni, vendar jih komentiraj če so nujni.

5. **Preveri v brskalniku** (Agent Browser če imaš):
   - stran naloži brez napak
   - glavni tok (mize → naročilo → plačilo) deluje
   - mobile responsive

6. **Push & PR**:
   ```bash
   git push origin feature/moja-nova-funkcija
   ```
   Odpri Pull Request proti `main` branchu. Izpolni PR template.

---

## ✅ Checklist pred PR

- [ ] Koda je v **TypeScript** (brez `any` razen če nujno)
- [ ] **`bun run lint`** = 0 errorjev
- [ ] **shadcn/ui** komponente uporabljene kjer mogoče
- [ ] **Tailwind** classe (ne inline styles razen če dinamične vrednosti)
- [ ] **Sticky footer** (ce aplikacija ima footer)
- [ ] **Mobile responsive** (testirano na mobilni širini)
- [ ] **Dark mode** podprt (uporablja `bg-background`, ne `bg-white`)
- [ ] **Slovensko besedilo** v UI (razen tehnični termini)
- [ ] **API route** za backend (ne server action)
- [ ] **Prisma schema** posodobljena + `db:push` testirano
- [ ] **Commit messages** po Conventional Commits
- [ ] **README** posodobljen če nova funkcija

---

## 🐛 Prijavljanje napak

Odpri [nov issue](https://github.com/markec12345678/ICEPOS/issues/new?template=bug_report.md) z:

1. **Opis** kaj se dogaja
2. **Koraki za reproduciranje**
3. **Pričakovano** vs. **dejansko** vedenje
4. **Screenshot** če relevantno
5. **Okolje**: brskalnik, OS, Next.js verzija

---

## 💡 Predlogi funkcij

Odpri [feature request](https://github.com/markec12345678/ICEPOS/issues/new?template=feature_request.md) z:

1. **Problem** ki ga rešuje
2. **Predlagana rešitev**
3. **Alternative** ki si jih premislil
4. **Dodatne informacije** (screenshoti, povezave do konkurenčnih rešitev)

---

## 📜 Licenca

Prispevki so licencirani pod **Apache License 2.0** (enako kot glavni projekt).

---

Hvala za tvoj prispevek! 🙏

— **Marko** ([@markec12345678](https://github.com/markec12345678))
