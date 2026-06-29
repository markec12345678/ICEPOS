// ============================================================
// KDS Routing — usmerjanje naročil na postaje (hladna, vroča, pijača, sladica)
// ============================================================
// Vsaka kategorija menu item-a se usmeri na določeno postajo.
// Kuhar na postaji vidi samo svoje item-e.
// ============================================================

export type KitchenStation = "hot" | "cold" | "drinks" | "dessert" | "all";

export interface StationConfig {
  id: KitchenStation;
  label: string;
  icon: string;
  color: string;
  description: string;
}

// Konfiguracija postaj
export const STATIONS: StationConfig[] = [
  {
    id: "hot",
    label: "Vroča",
    icon: "🔥",
    color: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400",
    description: "Glavne jedi, predjedi (vroče)",
  },
  {
    id: "cold",
    label: "Hladna",
    icon: "🥗",
    color: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400",
    description: "Hladne predjedi, solate",
  },
  {
    id: "drinks",
    label: "Pijača",
    icon: "🍹",
    color: "border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-400",
    description: "Vsa pijača (alkoholne, brezalkoholne)",
  },
  {
    id: "dessert",
    label: "Sladice",
    icon: "🍰",
    color: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
    description: "Sladice, torte, sladki izdelki",
  },
];

// Mapping kategorije → postaja
export function categoryToStation(category: string): KitchenStation {
  switch (category) {
    case "glavne_jedi":
    case "predjedi":
      return "hot";
    case "sladice":
      return "dessert";
    case "alkoholne":
    case "brezalkoholne":
      return "drinks";
    default:
      return "hot";
  }
}

// Razdeli item-e naročila po postajah
export function routeItemsByStation<T extends { category?: string; name?: string }>(
  items: (T & { category?: string })[]
): Record<KitchenStation, T[]> {
  const result: Record<KitchenStation, T[]> = {
    hot: [],
    cold: [],
    drinks: [],
    dessert: [],
    all: [],
  };

  for (const item of items) {
    const station = categoryToStation(item.category || "");
    result[station].push(item);
    result.all.push(item);
  }

  return result;
}

// Vrne postajo za prikaz (label, icon, color)
export function getStationConfig(station: KitchenStation): StationConfig | undefined {
  return STATIONS.find((s) => s.id === station);
}
