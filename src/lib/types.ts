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
  category: MenuCategory;
  price: number;
  vatRate: number;
  available: boolean;
  desc?: string | null;
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
  status: "open" | "paid" | "cancelled";
  items: OrderItem[];
  total: number;
  vatTotal: number;
  createdAt: string;
  paidAt: string | null;
  paymentMethod: "cash" | "card" | null;
  receiptNo: string | null;
  operator: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  note?: string;
}

export interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  avgOrderValue: number;
  openTables: number;
  totalTables: number;
  topItems: { name: string; count: number; revenue: number }[];
  hourly: { hour: string; revenue: number }[];
  paymentSplit: { method: string; count: number; total: number }[];
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
