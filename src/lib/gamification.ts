// ============================================================
// Gamification lib — badge-i in izzivi za Loyalty App
// ============================================================
// Badge-i se odklenejo glede na:
//   - Število obiskov
//   - Skupno porabo
//   - Točke zvestobe
//   - Level (Novinec/Bronca/Srebro/Zlato)
//   - Posebne dosežke (prvi obisk, 10 obiskov, itd.)
// ============================================================

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  // Pogoj za odklenitev
  requirement: {
    type: "visits" | "spend" | "points" | "level" | "special";
    value: number | string;
  };
  // Ali je odklenjen
  unlocked: boolean;
  // Datum odklenitve (opcijsko)
  unlockedAt?: string;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  icon: string;
  // Trenutni napredek
  progress: number;
  // Cilj
  target: number;
  // Ali je končan
  completed: boolean;
  // Nagrada v točkah
  rewardPoints: number;
}

// Vsi badge-i
export const ALL_BADGES: Omit<Badge, "unlocked" | "unlockedAt">[] = [
  {
    id: "first_visit",
    name: "Dobrodošli!",
    description: "Prvi obisk",
    icon: "👋",
    requirement: { type: "visits", value: 1 },
  },
  {
    id: "frequent_diner",
    name: "Pogost gost",
    description: "10 obiskov",
    icon: "🍽️",
    requirement: { type: "visits", value: 10 },
  },
  {
    id: "regular",
    name: "Stalna stranka",
    description: "25 obiskov",
    icon: "⭐",
    requirement: { type: "visits", value: 25 },
  },
  {
    id: "vip",
    name: "VIP gost",
    description: "50 obiskov",
    icon: "👑",
    requirement: { type: "visits", value: 50 },
  },
  {
    id: "big_spender",
    name: "Velikoporabnik",
    description: "500€ skupna poraba",
    icon: "💰",
    requirement: { type: "spend", value: 500 },
  },
  {
    id: "whale",
    name: "Kit",
    description: "1000€ skupna poraba",
    icon: "🐳",
    requirement: { type: "spend", value: 1000 },
  },
  {
    id: "points_collector",
    name: "Zbiralec točk",
    description: "100 točk",
    icon: "🎯",
    requirement: { type: "points", value: 100 },
  },
  {
    id: "points_master",
    name: "Mojster točk",
    description: "500 točk",
    icon: "🏆",
    requirement: { type: "points", value: 500 },
  },
  {
    id: "bronze",
    name: "Bronasti član",
    description: "Dosegel Bronca level",
    icon: "🥉",
    requirement: { type: "level", value: "Bronca" },
  },
  {
    id: "silver",
    name: "Srebrni član",
    description: "Dosegel Srebro level",
    icon: "🥈",
    requirement: { type: "level", value: "Srebro" },
  },
  {
    id: "gold",
    name: "Zlati član",
    description: "Dosegel Zlato level",
    icon: "🥇",
    requirement: { type: "level", value: "Zlato" },
  },
  {
    id: "explorer",
    name: "Raziskovalec",
    description: "Naročil preko Order Ahead",
    icon: "📱",
    requirement: { type: "special", value: "order_ahead" },
  },
];

// Preveri ali je badge odklenjen glede na customer podatke
export function checkBadgeUnlocked(
  badge: Omit<Badge, "unlocked" | "unlockedAt">,
  customer: {
    visitCount: number;
    totalSpent: number;
    points: number;
    level: string;
  }
): boolean {
  const { type, value } = badge.requirement;
  switch (type) {
    case "visits":
      return customer.visitCount >= (value as number);
    case "spend":
      return customer.totalSpent >= (value as number);
    case "points":
      return customer.points >= (value as number);
    case "level":
      return customer.level === value;
    case "special":
      // V produkciji: preveri posebne pogoje
      return false;
    default:
      return false;
  }
}

// Vrni vse badge-e z unlocked statusom
export function getBadgesWithStatus(customer: {
  visitCount: number;
  totalSpent: number;
  points: number;
  level: string;
}): Badge[] {
  return ALL_BADGES.map((badge) => ({
    ...badge,
    unlocked: checkBadgeUnlocked(badge, customer),
  }));
}

// Vrni aktivne izzive
export function getActiveChallenges(customer: {
  visitCount: number;
  totalSpent: number;
  points: number;
}): Challenge[] {
  return [
    {
      id: "visit_5_this_month",
      name: "5 obiskov ta mesec",
      description: "Obišči nas 5-krat ta mesec",
      icon: "📅",
      progress: Math.min(customer.visitCount, 5),
      target: 5,
      completed: customer.visitCount >= 5,
      rewardPoints: 10,
    },
    {
      id: "spend_100_this_month",
      name: "Porabi 100€ ta mesec",
      description: "Skupna poraba 100€ ta mesec",
      icon: "💸",
      progress: Math.min(Math.round(customer.totalSpent), 100),
      target: 100,
      completed: customer.totalSpent >= 100,
      rewardPoints: 20,
    },
    {
      id: "earn_50_points",
      name: "Zberi 50 točk",
      description: "Zberi 50 točk skupno",
      icon: "🎯",
      progress: Math.min(customer.points, 50),
      target: 50,
      completed: customer.points >= 50,
      rewardPoints: 15,
    },
  ];
}

// Število odklenjenih badge-ov
export function countUnlockedBadges(badges: Badge[]): number {
  return badges.filter((b) => b.unlocked).length;
}

// Skupne točke iz izzivov
export function getChallengeRewards(challenges: Challenge[]): number {
  return challenges.filter((c) => c.completed).reduce((s, c) => s + c.rewardPoints, 0);
}
