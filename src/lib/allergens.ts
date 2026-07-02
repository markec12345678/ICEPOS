/**
 * EU alergeni (Uredba 1169/2011) z ikonami in prevodi.
 * Skupna definicija za uporabo v POS OrderView, javnem meniju in kiosku.
 */

export const ALLERGEN_INFO: Record<string, { icon: string; sl: string; en: string }> = {
  gluten: { icon: "🌾", sl: "Gluten", en: "Gluten" },
  milk: { icon: "🥛", sl: "Mleko", en: "Milk" },
  eggs: { icon: "🥚", sl: "Jajca", en: "Eggs" },
  nuts: { icon: "🥜", sl: "Oreški", en: "Nuts" },
  soy: { icon: "🫘", sl: "Soja", en: "Soy" },
  fish: { icon: "🐟", sl: "Ribe", en: "Fish" },
  shellfish: { icon: "🦐", sl: "Rakovci", en: "Shellfish" },
  sesame: { icon: "⚪", sl: "Sezam", en: "Sesame" },
  sulfites: { icon: "🍷", sl: "Sulfiti", en: "Sulfites" },
  celery: { icon: "🥬", sl: "Zelena", en: "Celery" },
  mustard: { icon: "🟡", sl: "Gorčica", en: "Mustard" },
  lupin: { icon: "🟠", sl: "Volčji bob", en: "Lupin" },
  molluscs: { icon: "🦪", sl: "Mehkužci", en: "Molluscs" },
  peanuts: { icon: "🥜", sl: "Arašidi", en: "Peanuts" },
};

export const ALLERGEN_KEYS = Object.keys(ALLERGEN_INFO);

/**
 * Parse alergene iz JSON stringa.
 */
export function parseAllergens(allergens: string | null | undefined): string[] {
  if (!allergens) return [];
  try {
    const parsed = JSON.parse(allergens) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Preveri ali jed vsebuje specifičen alergen.
 */
export function hasAllergen(item: { allergens?: string | null }, allergen: string): boolean {
  return parseAllergens(item.allergens).includes(allergen);
}

/**
 * Vrne list alergenov, ki so v jedi.
 */
export function getItemAllergens(item: { allergens?: string | null }): string[] {
  return parseAllergens(item.allergens);
}
