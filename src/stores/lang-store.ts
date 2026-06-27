import { create } from "zustand";

export type Lang = "sl" | "en";

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// Slovar vseh besednih zvez v aplikaciji
const DICT: Record<Lang, Record<string, string>> = {
  sl: {
    // Navigacija
    "nav.tables": "Mize",
    "nav.order": "Naročilo",
    "nav.receipts": "Računi",
    "nav.kitchen": "Kuhinja",
    "nav.menu": "Meni",
    "nav.reservations": "Rezervacije",
    "nav.shift": "Smena",
    "nav.dashboard": "Pregled",
    "nav.monthly": "Mesečno poročilo",
    "nav.zreport": "Z-report",
    "nav.settings": "Nastavitve",
    "nav.operators": "Operaterji",
    "nav.tablesAdmin": "Mize admin",
    "nav.more": "Več",

    // Splošno
    "common.save": "Shrani",
    "common.cancel": "Prekliči",
    "common.delete": "Izbriši",
    "common.edit": "Uredi",
    "common.add": "Dodaj",
    "common.search": "Iskanje",
    "common.close": "Zapri",
    "common.confirm": "Potrdi",
    "common.back": "Nazaj",
    "common.print": "Natisni",
    "common.refresh": "Osveži",
    "common.loading": "Nalagam...",
    "common.empty": "Ni podatkov",
    "common.total": "Skupaj",
    "common.date": "Datum",
    "common.time": "Čas",
    "common.status": "Status",
    "common.name": "Ime",
    "common.price": "Cena",
    "common.quantity": "Količina",
    "common.note": "Opomba",

    // Mize
    "tables.title": "Mize",
    "tables.free": "Prosta",
    "tables.occupied": "Zasedena",
    "tables.reserved": "Rezervirana",
    "tables.items": "postavk",
    "tables.seats": "oseb",
    "tables.section": "Sekcija",
    "tables.reservationsToday": "Rezervacije danes",

    // Naročilo
    "order.title": "Naročilo",
    "order.cart": "Račun",
    "order.empty": "Voziček je prazen",
    "order.pay": "Plačaj",
    "order.save": "Shrani",
    "order.kitchen": "Kuhinja",
    "order.transfer": "Preseli",
    "order.discount": "Popust",
    "order.subtotal": "Vrednost (brez DDV)",
    "order.vat": "DDV",
    "order.total": "Za plačilo",

    // Plačilo
    "payment.title": "Plačilo računa",
    "payment.cash": "Gotovina",
    "payment.card": "Kartica",
    "payment.tendered": "Prejeto",
    "payment.change": "Vračilo",
    "payment.split": "Razdeli",
    "payment.process": "Fiskaliziraj in zaključi",

    // Smena
    "shift.title": "Smena blagajnika",
    "shift.active": "Aktivna smena",
    "shift.noActive": "Ni aktivne smene",
    "shift.start": "Začni smeno",
    "shift.end": "Zaključi smeno",
    "shift.operator": "Operater",
    "shift.startCash": "Začetna gotovina",
    "shift.revenue": "Prihodek",
    "shift.orders": "Računov",

    // FURS
    "furs.title": "FURS fiskalizacija",
    "furs.zoi": "ZOI",
    "furs.eor": "EOR",
    "furs.verified": "FURS — SRS fiskaliziran",

    // Kuhinja
    "kitchen.title": "Kuhinja Display (KOT)",
    "kitchen.new": "Nova",
    "kitchen.preparing": "V pripravi",
    "kitchen.ready": "Pripravljeno",
    "kitchen.startPrep": "Začni pripravo",
    "kitchen.markReady": "Pripravljeno",
    "kitchen.callTable": "Pozovi mizo",
    "kitchen.connected": "Povezano",
    "kitchen.disconnected": "Brez povezave",
  },
  en: {
    // Navigation
    "nav.tables": "Tables",
    "nav.order": "Order",
    "nav.receipts": "Receipts",
    "nav.kitchen": "Kitchen",
    "nav.menu": "Menu",
    "nav.reservations": "Reservations",
    "nav.shift": "Shift",
    "nav.dashboard": "Dashboard",
    "nav.monthly": "Monthly report",
    "nav.zreport": "Z-report",
    "nav.settings": "Settings",
    "nav.operators": "Operators",
    "nav.tablesAdmin": "Tables admin",
    "nav.more": "More",

    // Common
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.add": "Add",
    "common.search": "Search",
    "common.close": "Close",
    "common.confirm": "Confirm",
    "common.back": "Back",
    "common.print": "Print",
    "common.refresh": "Refresh",
    "common.loading": "Loading...",
    "common.empty": "No data",
    "common.total": "Total",
    "common.date": "Date",
    "common.time": "Time",
    "common.status": "Status",
    "common.name": "Name",
    "common.price": "Price",
    "common.quantity": "Quantity",
    "common.note": "Note",

    // Tables
    "tables.title": "Tables",
    "tables.free": "Free",
    "tables.occupied": "Occupied",
    "tables.reserved": "Reserved",
    "tables.items": "items",
    "tables.seats": "seats",
    "tables.section": "Section",
    "tables.reservationsToday": "Reservations today",

    // Order
    "order.title": "Order",
    "order.cart": "Cart",
    "order.empty": "Cart is empty",
    "order.pay": "Pay",
    "order.save": "Save",
    "order.kitchen": "Kitchen",
    "order.transfer": "Transfer",
    "order.discount": "Discount",
    "order.subtotal": "Subtotal (ex VAT)",
    "order.vat": "VAT",
    "order.total": "Total",

    // Payment
    "payment.title": "Payment",
    "payment.cash": "Cash",
    "payment.card": "Card",
    "payment.tendered": "Tendered",
    "payment.change": "Change",
    "payment.split": "Split",
    "payment.process": "Fiscalize and complete",

    // Shift
    "shift.title": "Cashier shift",
    "shift.active": "Active shift",
    "shift.noActive": "No active shift",
    "shift.start": "Start shift",
    "shift.end": "End shift",
    "shift.operator": "Operator",
    "shift.startCash": "Starting cash",
    "shift.revenue": "Revenue",
    "shift.orders": "Orders",

    // FURS
    "furs.title": "FURS fiscalization",
    "furs.zoi": "ZOI",
    "furs.eor": "EOR",
    "furs.verified": "FURS — SRS fiscalized",

    // Kitchen
    "kitchen.title": "Kitchen Display (KOT)",
    "kitchen.new": "New",
    "kitchen.preparing": "Preparing",
    "kitchen.ready": "Ready",
    "kitchen.startPrep": "Start preparing",
    "kitchen.markReady": "Mark ready",
    "kitchen.callTable": "Call table",
    "kitchen.connected": "Connected",
    "kitchen.disconnected": "Disconnected",
  },
};

const STORAGE_KEY = "icepos-si-lang";

function getInitialLang(): Lang {
  if (typeof window === "undefined") return "sl";
  const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
  return stored === "en" || stored === "sl" ? stored : "sl";
}

export const useLang = create<LangState>((set, get) => ({
  lang: getInitialLang(),
  setLang: (l) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, l);
    }
    set({ lang: l });
  },
  t: (key, params) => {
    const { lang } = get();
    let str = DICT[lang][key] || DICT.sl[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  },
}));
