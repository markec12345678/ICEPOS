# 🚀 Gostilna POS — Hitri začetek (5 minut)

> Navdihnjeno po Toast POS in Square onboarding vodnikih.

---

## ⚡ Koraki za začetek

### 1️⃣ Prijava (30 sekund)
- Odpri `/` v brskalniku
- Klikni **"Prijava s PIN"**
- Vnesi PIN: `9999` (admin) ali `1234` (blagajnik)

### 2️⃣ Uvozi zaloge (2 minuti)
1. Klikni **Zaloga** v stranski vrstici
2. Klikni **"Uvozi artikle"**
3. Klikni **"Uvozi vse (361)"** — vsi evropski artikli s stanjem 0
4. Klikni **"Bulk zaloga"**
5. Filtriraj po "Stanje 0" → klikni **10** (hitro nastavi vse na 10)
6. Klikni **"Shrani"**

### 3️⃣ Preveri meni (1 minuta)
- Klikni **Meni** — 34 demo postavk je že naložen
- Klikni **Slike jedi** → **"Generiraj 5 AI slik"** za vizualno izboljšavo

### 4️⃣ Odpri smeno (30 sekund)
- Klikni **Smena** → **"Začni novo smeno"**
- Vnesi začetno gotovino (npr. 150€)

### 5️⃣ Sprejmi prvo naročilo! (1 minuta)
1. Klikni **Mize** → klikni mizo
2. Dodaj postavke v voziček
3. Klikni **"Pošlji vuhinjo"**
4. Klikni **"Plačaj"** → izberi gotovina/kartica
5. Račun je fiskaliziran! ✅

---

## 📋 Dnevni workflow

```
ZJUTRAJ:
  1. Prijava s PIN
  2. Odpri smeno (Smena → Začni)
  3. Preveri zaloge (Dashboard → low-stock banner)
  4. Preveri rezervacije (Rezervacije)

MED DELOM:
  5. Mize → izberi mizo → naroči → pošlji v kuhinjo
  6. Gost jedje → Plačaj (gotovina/kartica/Sumup/Apple Pay)
  7. Preveri dostavo (Wolt/Deliverect)

ZVEČER:
  8. Zaključi smeno (Smena → Zaključi)
  9. Z-report (Z-report → Generiraj)
  10. Izvozi račune (Računovodstvo → CSV/Pantheon)
  11. Odjava
```

---

## 🔑 Demo PIN kode

| Vloga | PIN | Ime |
|-------|-----|-----|
| Admin | `9999` | Admin |
| Blagajnik | `1234` | Ana |
| Blagajnik | `5678` | Marko |

Hotel Slavija: `10999` (Direktor), `2234` (Mija), `6678` (Tomaž)

---

## 📍 Vse aplikacije

| Route | Aplikacija |
|-------|-----------|
| `/` | POS Blagajna |
| `/natakar` | Natakar (mobilna) |
| `/meni` | Online meni (QR) |
| `/kiosk` | Kiosk (samopostrežba) |
| `/cdu` | Zaslon za gosta |
| `/zvestoba` | Loyalty App |

---

## ❓ Pomoč

- 📖 [Celoten uporabniški vodič](./USER_GUIDE.md)
- 📄 [README](../README.md)
- 🔧 [Nastavitve .env](../.env.example)

**Gostilna POS** — vodilna slovenska restavracijska blagajna. 🚀
