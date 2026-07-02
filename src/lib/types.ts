// Tipi za slovensko POS aplikacijo

export type MenuCategory =
  | "predjedi"
  | "glavne_jedi"
  | "brezalkoholne"
  | "alkoholne"
  | "sladice";

export interface MenuItem {
  id: string;
  name: string;
  nameEn?: string | null;
  category: MenuCategory;
  price: number;
  vatRate: number;
  available: boolean;
  desc?: string | null;
  descEn?: string | null;
  allergens?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  isFavorite?: boolean;
  isDailySpecial?: boolean;
  imageUrl?: string | null;
  createdAt: string;
}

export interface Table {
  id: string;
  number: number;
  name: string;
  seats: number;
  section: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  menuItem: MenuItem;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  note?: string | null;
}

export interface Order {
  id: string;
  tableId: string;
  table: Table;
  status: "open" | "paid" | "cancelled" | "storno";
  items: OrderItem[];
  total: number;
  vatTotal: number;
  createdAt: string;
  paidAt: string | null;
  paymentMethod: "cash" | "card" | null;
  receiptNo: string | null;
  invoiceNumber: string | null;
  zoi: string | null;
  eor: string | null;
  fursXml: string | null;
  businessUnit: string;
  cashRegister: string;
  operator: string;
  operatorTaxNo: string;
  // Storno
  stornoOf: string | null;
  stornoReason: string | null;
  stornoAt: string | null;
  stornoZoi: string | null;
  stornoEor: string | null;
  tip?: number;
  flags?: string | null; // JSON array: ["vip", "birthday", "rush", "allergy"]
  customerId?: string | null;
}

export interface Modifier {
  id: string;
  label: string;
  priceDelta: number;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  note?: string;
  modifiers?: Modifier[];
}

export interface DashboardStats {
  todayRevenue: number;
  todayTips: number;
  todayOrders: number;
  avgOrderValue: number;
  openTables: number;
  totalTables: number;
  topItems: { name: string; count: number; revenue: number }[];
  hourly: { hour: string; revenue: number }[];
  paymentSplit: { method: string; count: number; total: number }[];
  categoryStats: {
    category: string;
    count: number;
    revenue: number;
    items: number;
  }[];
}

export const CATEGORIES: { id: MenuCategory; label: string; icon: string }[] = [
  { id: "predjedi", label: "Predjedi", icon: "🥗" },
  { id: "glavne_jedi", label: "Glavne jedi", icon: "🍽️" },
  { id: "sladice", label: "Sladice", icon: "🍰" },
  { id: "brezalkoholne", label: "Brezalkoholne", icon: "🥤" },
  { id: "alkoholne", label: "Alkoholne", icon: "🍷" },
];

export const VAT_RATES = {
  REDUCED: 0.095, // znižana stopnja (hrana, nealk. pijača)
  STANDARD: 0.22, // splošna stopnja (alkohol)
};

export function formatEUR(amount: number): string {
  return new Intl.NumberFormat("sl-SI", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("sl-SI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("sl-SI", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}
