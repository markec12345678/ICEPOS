// ============================================================
// Upsell AI Engine — predlagaj dodatke glede na vsebino vozička
// ============================================================
// Algoritem:
//   1. Analizira kategorije v vozičku
//   2. Predlaga pogosto kupljene skupine (market basket analysis)
//   3. Če ni pijače v vozičku → predlagaj pijačo
//   4. Če je glavna jed → predlagaj sladico
//   5. Hardcoded pravila + kasneje ML
// ============================================================

import type { MenuItem } from "./types";

export interface UpsellSuggestion {
  item: MenuItem;
  reason: string;
  icon: string;
  // Confidence 0-1
  confidence: number;
}

// Pogosto kupljene skupine (market basket)
const COMBO_RULES: {
  trigger: string[]; // kategorije v vozičku
  suggest: string[]; // kategorije za predlagat
  reason: string;
  icon: string;
}[] = [
  {
    trigger: ["glavne_jedi", "predjedi"],
    suggest: ["alkoholne", "brezalkoholne"],
    reason: "Pijača k jedi?",
    icon: "🍷",
  },
  {
    trigger: ["glavne_jedi"],
    suggest: ["sladice"],
    reason: "Sladica po jedi?",
    icon: "🍰",
  },
  {
    trigger: ["brezalkoholne"],
    suggest: ["sladice"],
    reason: "Kavo ali sladico?",
    icon: "☕",
  },
  {
    trigger: ["alkoholne"],
    suggest: ["sladice", "predjedi"],
    reason: "Še kaj pridružite?",
    icon: "🥜",
  },
];

// Glavna funkcija — vrne upsell predloge glede na voziček
export function getUpsellSuggestions(
  cartItems: MenuItem[],
  menuItems: MenuItem[],
  limit: number = 3
): UpsellSuggestion[] {
  if (cartItems.length === 0) return [];

  // Kategorije v vozičku
  const cartCategories = new Set(cartItems.map((i) => i.category));
  const cartItemIds = new Set(cartItems.map((i) => i.id));

  const suggestions: UpsellSuggestion[] = [];

  // 1. Preveri combo pravila
  for (const rule of COMBO_RULES) {
    // Ali voziček vsebuje vsaj eno od trigger kategorij?
    const hasTrigger = rule.trigger.some((c) => cartCategories.has(c as MenuItem["category"]));
    if (!hasTrigger) continue;

    // Ali voziček že vsebuje suggest kategorijo?
    const alreadyHas = rule.suggest.some((c) => cartCategories.has(c as MenuItem["category"]));
    if (alreadyHas) continue;

    // Poišči item-e iz suggest kategorij ki še niso v vozičku
    const candidates = menuItems.filter(
      (m) =>
        rule.suggest.includes(m.category) &&
        !cartItemIds.has(m.id) &&
        m.available
    );

    if (candidates.length > 0) {
      // Vzemi najbolj prodajan (ali najcenejši za boljšo konverzijo)
      const sorted = candidates.sort((a, b) => a.price - b.price);
      const top = sorted.slice(0, 2);
      for (const item of top) {
        suggestions.push({
          item,
          reason: rule.reason,
          icon: rule.icon,
          confidence: 0.8,
        });
      }
    }
  }

  // 2. Če ni pijače v vozičku, vedno predlagaj
  const hasDrink = cartCategories.has("alkoholne") || cartCategories.has("brezalkoholne");
  if (!hasDrink) {
    const drinks = menuItems.filter(
      (m) =>
        (m.category === "brezalkoholne" || m.category === "alkoholne") &&
        !cartItemIds.has(m.id) &&
        m.available
    );
    // Vzemi 1 najcenejšo pijačo
    if (drinks.length > 0) {
      const cheapest = drinks.sort((a, b) => a.price - b.price)[0];
      // Preveri da ni že dodan
      if (!suggestions.find((s) => s.item.id === cheapest.id)) {
        suggestions.push({
          item: cheapest,
          reason: "Še kaj za piti?",
          icon: "🥤",
          confidence: 0.9,
        });
      }
    }
  }

  // 3. Če je glavna jed ampak ni sladice, predlagaj
  const hasMain = cartCategories.has("glavne_jedi");
  const hasDessert = cartCategories.has("sladice");
  if (hasMain && !hasDessert) {
    const desserts = menuItems.filter(
      (m) =>
        m.category === "sladice" &&
        !cartItemIds.has(m.id) &&
        m.available
    );
    if (desserts.length > 0) {
      const cheapest = desserts.sort((a, b) => a.price - b.price)[0];
      if (!suggestions.find((s) => s.item.id === cheapest.id)) {
        suggestions.push({
          item: cheapest,
          reason: "Sladica po jedi?",
          icon: "🍰",
          confidence: 0.85,
        });
      }
    }
  }

  // Odstrani duplikate, omeji na `limit`
  const unique = suggestions.filter(
    (s, i, arr) => arr.findIndex((x) => x.item.id === s.item.id) === i
  );

  return unique.slice(0, limit);
}

// Preveri ali naj prikažemo upsell (po X postavkah ali nad Y zneskom)
export function shouldShowUpsell(cartCount: number, cartTotal: number): boolean {
  return cartCount >= 1 && cartTotal > 0;
}
