## 📋 Opis spremembe

Jasen in jedrnat opis **kaj** sprememba naredi in **zakaj** je potrebna.

## 🔗 Povezani issue

Closes #123
Related #456

## 🎯 Tip spremembe

- [ ] 🐛 `fix` — popravljena napaka
- [ ] ✨ `feat` — nova funkcija
- [ ] ♻️ `refactor` — refactor brez spremembe funkcionalnosti
- [ ] 🎨 `style` — UI/styling
- [ ] 📚 `docs` — dokumentacija
- [ ] ⚡ `perf` — performanca
- [ ] 🔧 `chore` — vzdrževanje
- [ ] 🇸🇮 `furs` — povezano s FURS fiskalizacijo
- [ ] 📱 `mobile` — mobilne izboljšave

## ✅ Checklist

- [ ] Koda je v **TypeScript** (brez `any` razen če nujno)
- [ ] **`bun run lint`** = 0 errorjev
- [ ] **shadcn/ui** komponente uporabljene kjer mogoče
- [ ] **Tailwind** classe (ne inline styles razen če dinamične vrednosti)
- [ ] **Mobile responsive** (testirano na mobilni širini)
- [ ] **Dark mode** podprt (uporablja `bg-background`, ne `bg-white`)
- [ ] **Slovensko besedilo** v UI (razen tehnični termini)
- [ ] **API route** za backend (ne server action)
- [ ] **Prisma schema** posodobljena + `db:push` testirano (če applicable)
- [ ] **README** posodobljen če nova funkcija
- [ ] **CHANGELOG** posodobljen
- [ ] **Commit messages** po [Conventional Commits](https://www.conventionalcommits.org/)
- [ ] Ni `console.log` v produkciji (razen debug logging)

## 🧪 Testiranje

Kako si testiral to spremembo?

- [ ] Ročno v brskalniku (desktop)
- [ ] Ročno v brskalniku (mobile širina)
- [ ] Dark mode preklop
- [ ] Glavni tok: mize → naročilo → plačilo → račun
- [ ] Edge case: prazen voziček, negativne vrednosti, itd.

## 📸 Screenshot / demo (če UI sprememba)

Prilepi screenshot ali GIF spremembe.

## 📝 Dodatne opombe

Reci če je še kaj pomembnega za reviewera (npr. breaking changes, migracije, itd.).
