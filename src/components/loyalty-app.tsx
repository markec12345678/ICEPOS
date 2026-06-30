"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Toaster, toast } from "sonner";
import {
  Star,
  Gift,
  Award,
  TrendingUp,
  ShoppingBag,
  Phone,
  LogOut,
  QrCode,
  Sparkles,
  Check,
  Loader2,
  Crown,
  Medal,
  Clock,
  Utensils,
  Plus,
  Minus,
  Search,
} from "lucide-react";
import { formatEUR, formatDateTime, CATEGORIES, type MenuItem } from "@/lib/types";
import QRCode from "qrcode";

// ============================================================
// Tipi
// ============================================================

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  points: number;
  totalSpent: number;
  visitCount: number;
  level: string;
  nextLevel: string | null;
  pointsToNext: number;
  note: string | null;
  createdAt: string;
}

interface Order {
  id: string;
  invoiceNumber: string | null;
  total: number;
  tip: number;
  paidAt: string | null;
  paymentMethod: string | null;
  items: { name: string; quantity: number; price: number }[];
}

interface Reward {
  id: string;
  name: string;
  pointsCost: number;
  icon: string;
  desc: string;
  available: boolean;
}

// ============================================================
// Glavna komponenta
// ============================================================

export function LoyaltyApp() {
  const [token, setToken] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [tab, setTab] = useState<"home" | "rewards" | "order" | "history">("home");
  const [loading, setLoading] = useState(true);
  const [qrUrl, setQrUrl] = useState<string>("");

  // Preberi token iz localStorage
  useEffect(() => {
    const stored = localStorage.getItem("loyalty-token");
    if (stored) {
      setToken(stored);
    } else {
      setLoading(false);
    }
  }, []);

  // Naloži podatke ko imamo token
  const loadCustomer = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/loyalty/me?token=${token}`);
      if (!res.ok) {
        localStorage.removeItem("loyalty-token");
        setToken(null);
        return;
      }
      const data = await res.json();
      setCustomer(data.customer);
      setOrders(data.orders);

      // Generiraj QR kodo
      try {
        const url = await QRCode.toDataURL(token, {
          width: 256,
          margin: 1,
          color: { dark: "#1e293b", light: "#ffffff" },
        });
        setQrUrl(url);
      } catch {
        // ignore
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  // Naloži rewards
  useEffect(() => {
    fetch(`/api/loyalty/redeem${token ? `?token=${token}` : ""}`)
      .then((r) => r.json())
      .then((data) => setRewards(data.rewards || []))
      .catch(() => {});
  }, [token, customer?.points]);

  function logout() {
    localStorage.removeItem("loyalty-token");
    setToken(null);
    setCustomer(null);
    setOrders([]);
    setTab("home");
  }

  // Login screen
  if (!token || !customer) {
    return (
      <>
        <LoyaltyLogin onLogin={(t) => { setToken(t); setLoading(true); }} />
        <Toaster richColors position="top-center" />
      </>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const levelIcon = customer.level === "Zlato" ? Crown : customer.level === "Srebro" ? Medal : Star;
  const LevelIcon = levelIcon;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-amber-50 to-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">Klub zvestobe</p>
            <p className="font-bold">{customer.name}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-20">
        {tab === "home" && (
          <HomeTab customer={customer} qrUrl={qrUrl} LevelIcon={LevelIcon} />
        )}
        {tab === "rewards" && (
          <RewardsTab
            rewards={rewards}
            customer={customer}
            token={token}
            onRedeemed={() => loadCustomer()}
          />
        )}
        {tab === "order" && (
          <OrderAheadTab token={token} customer={customer} />
        )}
        {tab === "history" && <HistoryTab orders={orders} />}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t bg-card shadow-lg">
        <BottomNav active={tab} onChange={setTab} />
      </nav>

      <Toaster richColors position="top-center" />
    </div>
  );
}

// ============================================================
// Login Screen
// ============================================================

function LoyaltyLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/loyalty/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Napaka");
        return;
      }
      localStorage.setItem("loyalty-token", data.token);
      onLogin(data.token);
      toast.success(`Dobrodošli, ${data.customer.name}!`);
    } catch {
      toast.error("Napaka pri prijavi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-amber-100 to-orange-50 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Klub zvestobe</h1>
          <p className="text-sm text-muted-foreground">
            Gostilna Pri Marku — zbiraj točke, unovči nagrade
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <label className="mb-2 block text-sm font-medium">
            <Phone className="mr-1.5 inline h-4 w-4" />
            Vnesi telefonsko številko
          </label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="031 234 567"
            className="text-base"
            autoFocus
          />
          <Button
            onClick={submit}
            disabled={loading || !phone.trim()}
            className="mt-4 w-full"
            size="lg"
          >
            {loading ? "Prijava..." : "Prijava"}
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Vsakih 10 € porabe = 1 točka
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Še niste registrirani? Vprašajte natakarja.
        </p>
      </div>
      <Toaster richColors position="top-center" />
    </div>
  );
}

// ============================================================
// Home Tab — points, level, QR
// ============================================================

function HomeTab({
  customer,
  qrUrl,
  LevelIcon,
}: {
  customer: Customer;
  qrUrl: string;
  LevelIcon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="space-y-4">
      {/* Points card */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/80">Vaše točke</p>
            <p className="text-5xl font-bold">{customer.points}</p>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
            <LevelIcon className="h-8 w-8" />
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-white/10 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{customer.level}</span>
            {customer.nextLevel && (
              <span className="text-white/80">
                {customer.pointsToNext} točk do {customer.nextLevel}
              </span>
            )}
          </div>
          {customer.nextLevel && (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{
                  width: `${Math.min(100, ((customer.points - getLevelBase(customer.level)) / (getLevelBase(customer.nextLevel) - getLevelBase(customer.level))) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <TrendingUp className="mb-1 h-5 w-5 text-emerald-600" />
          <p className="text-xs text-muted-foreground">Skupaj porabljeno</p>
          <p className="text-xl font-bold">{formatEUR(customer.totalSpent)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <ShoppingBag className="mb-1 h-5 w-5 text-blue-600" />
          <p className="text-xs text-muted-foreground">Št. obiskov</p>
          <p className="text-xl font-bold">{customer.visitCount}</p>
        </div>
      </div>

      {/* QR Code card */}
      <div className="rounded-2xl border bg-card p-6 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Vaša kartica zvestobe</h3>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Pokažite to kodo natakarju ob plačilu
        </p>
        {qrUrl && (
          <img
            src={qrUrl}
            alt="QR koda zvestobe"
            className="mx-auto rounded-lg border-2 border-amber-200"
            width={200}
            height={200}
          />
        )}
      </div>

      {/* Member since */}
      <div className="rounded-xl border bg-card p-4 text-center text-sm text-muted-foreground">
        <Clock className="mr-1.5 inline h-4 w-4" />
        Član od {new Date(customer.createdAt).toLocaleDateString("sl-SI", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </div>
    </div>
  );
}

function getLevelBase(level: string): number {
  switch (level) {
    case "Novinec": return 0;
    case "Bronca": return 100;
    case "Srebro": return 200;
    case "Zlato": return 500;
    default: return 0;
  }
}

// ============================================================
// Rewards Tab
// ============================================================

function RewardsTab({
  rewards,
  customer,
  token,
  onRedeemed,
}: {
  rewards: Reward[];
  customer: Customer;
  token: string;
  onRedeemed: () => void;
}) {
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [voucher, setVoucher] = useState<{ code: string; name: string } | null>(null);

  async function redeem(reward: Reward) {
    if (!reward.available) return;
    setRedeeming(reward.id);
    try {
      const res = await fetch("/api/loyalty/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, rewardId: reward.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Napaka");
        return;
      }
      setVoucher({ code: data.voucherCode, name: reward.name });
      toast.success(`${reward.name} unovčeno!`);
      onRedeemed();
    } catch {
      toast.error("Napaka pri unovčevanju");
    } finally {
      setRedeeming(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Nagrade</h2>
        <p className="text-sm text-muted-foreground">
          Imate {customer.points} točk — izberite nagrado
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rewards.map((reward) => (
          <div
            key={reward.id}
            className={`rounded-xl border-2 p-4 transition-all ${
              reward.available
                ? "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
                : "border-border opacity-60"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="text-3xl">{reward.icon}</div>
              <Badge
                variant="outline"
                className={
                  reward.available
                    ? "border-amber-400 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400"
                    : "border-border text-muted-foreground"
                }
              >
                {reward.pointsCost} točk
              </Badge>
            </div>
            <h3 className="mt-2 font-semibold">{reward.name}</h3>
            <p className="text-xs text-muted-foreground">{reward.desc}</p>
            <Button
              size="sm"
              className="mt-3 w-full"
              variant={reward.available ? "default" : "outline"}
              disabled={!reward.available || redeeming === reward.id}
              onClick={() => redeem(reward)}
            >
              {redeeming === reward.id ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : reward.available ? (
                <Gift className="mr-1 h-3 w-3" />
              ) : null}
              {reward.available ? "Unovči" : `Manjka ${reward.pointsCost - customer.points} točk`}
            </Button>
          </div>
        ))}
      </div>

      {/* Voucher dialog */}
      <Dialog open={!!voucher} onOpenChange={() => setVoucher(null)}>
        <DialogContent className="mx-4 max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <Check className="h-5 w-5 text-emerald-600" />
              Nagrada unovčena!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="text-4xl">🎉</div>
            <p className="font-medium">{voucher?.name}</p>
            <div className="rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <p className="text-xs text-muted-foreground">Koda bona</p>
              <p className="font-mono text-xl font-bold text-amber-700 dark:text-amber-400">
                {voucher?.code}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Pokažite to kodo natakarju ob plačilu. Koda velja 30 dni.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setVoucher(null)} className="w-full">
              Razumem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// History Tab
// ============================================================

function HistoryTab({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShoppingBag className="mb-3 h-12 w-12 text-muted-foreground" />
        <p className="font-medium">Ni še obiskov</p>
        <p className="text-sm text-muted-foreground">
          Vaši obiski se bodo prikazali tukaj
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">Zgodovina obiskov</h2>
      {orders.map((order) => (
        <div key={order.id} className="rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground">
                {order.paidAt ? formatDateTime(order.paidAt) : "—"}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                {order.invoiceNumber || "—"}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold">{formatEUR(order.total)}</p>
              {order.tip > 0 && (
                <p className="text-xs text-amber-600">+{formatEUR(order.tip)} napitnina</p>
              )}
              <p className="text-xs text-muted-foreground">
                +{Math.floor(order.total / 10)} točk
              </p>
            </div>
          </div>
          <div className="mt-2 border-t pt-2">
            <div className="flex flex-wrap gap-1">
              {order.items.slice(0, 5).map((it, i) => (
                <span
                  key={i}
                  className="rounded bg-muted px-2 py-0.5 text-xs"
                >
                  {it.quantity}× {it.name}
                </span>
              ))}
              {order.items.length > 5 && (
                <span className="text-xs text-muted-foreground">
                  +{order.items.length - 5} več
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Bottom Navigation
// ============================================================

function BottomNav({
  active,
  onChange,
}: {
  active: "home" | "rewards" | "order" | "history";
  onChange: (v: "home" | "rewards" | "order" | "history") => void;
}) {
  const items = [
    { id: "home" as const, label: "Domov", icon: Star },
    { id: "order" as const, label: "Naroči", icon: Utensils },
    { id: "rewards" as const, label: "Nagrade", icon: Gift },
    { id: "history" as const, label: "Zgodovina", icon: Award },
  ];

  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
              active === item.id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </button>
        );
      })}
    </>
  );
}

// ============================================================
// Order Ahead Tab — mobile naročanje pred prihodom
// ============================================================

function OrderAheadTab({
  token,
  customer,
}: {
  token: string;
  customer: Customer;
}) {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<{ menuItem: MenuItem; quantity: number }[]>([]);
  const [pickupTime, setPickupTime] = useState("");
  const [orderType, setOrderType] = useState<"dinein" | "takeaway">("dinein");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("glavne_jedi");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ orderId: string; total: number; points: number; pickupTime: string } | null>(null);

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then((items: MenuItem[]) => setMenu(items.filter((i) => i.available)))
      .catch(() => toast.error("Napaka pri nalaganju menija"));
  }, []);

  const filtered = menu.filter((m) => {
    if (search) return m.name.toLowerCase().includes(search.toLowerCase());
    return m.category === category;
  });

  const cartTotal = cart.reduce((s, c) => s + c.menuItem.price * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  }

  function updateQty(itemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) =>
          c.menuItem.id === itemId ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  }

  async function submitOrder() {
    if (cart.length === 0 || !pickupTime) {
      toast.error("Dodaj postavke in izberi čas prevzema");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/loyalty/order-ahead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          items: cart.map((c) => ({
            menuItemId: c.menuItem.id,
            quantity: c.quantity,
          })),
          pickupTime,
          type: orderType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Napaka");
        return;
      }
      setSuccess({
        orderId: data.orderId,
        total: data.total,
        points: data.pointsEarned,
        pickupTime,
      });
      setCart([]);
      toast.success(data.message);
    } catch {
      toast.error("Napaka pri naročanju");
    } finally {
      setSubmitting(false);
    }
  }

  // Success screen
  if (success) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-center text-white shadow-lg">
          <Check className="mx-auto mb-3 h-16 w-16" />
          <h2 className="text-2xl font-bold">Naročilo uspešno!</h2>
          <p className="mt-2 text-white/90">
            Prevzem: <strong>{success.pickupTime}</strong>
          </p>
          <p className="mt-1 text-3xl font-bold">{formatEUR(success.total)}</p>
          <p className="mt-2 text-sm text-white/80">
            +{success.points} točk zvestobe
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">ID naročila</p>
          <p className="font-mono text-lg font-bold">
            #{success.orderId.slice(-6).toUpperCase()}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Sledite statusu na: /sledi/{success.orderId}
          </p>
        </div>
        <Button className="w-full" onClick={() => setSuccess(null)}>
          Novo naročilo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Utensils className="h-5 w-5 text-primary" />
          Naroči pred prihodom
        </h2>
        <p className="text-sm text-muted-foreground">
          Naroči zdaj, prevzemi kasneje — brez čakanja
        </p>
      </div>

      {/* Pickup time + type */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Čas prevzema</label>
          <Input
            type="time"
            value={pickupTime}
            onChange={(e) => setPickupTime(e.target.value)}
            className="text-base"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Tip</label>
          <div className="flex gap-1">
            <button
              onClick={() => setOrderType("dinein")}
              className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium ${
                orderType === "dinein"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border"
              }`}
            >
              🍽️ Na mizi
            </button>
            <button
              onClick={() => setOrderType("takeaway")}
              className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium ${
                orderType === "takeaway"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border"
              }`}
            >
              🥡 Poberi
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Išči jed..."
          className="pl-9"
        />
      </div>

      {/* Categories */}
      {!search && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${
                category === c.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Menu items */}
      <div className="grid grid-cols-1 gap-2">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-xl border bg-card p-3"
          >
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <p className="font-medium leading-tight">{item.name}</p>
              <p className="text-sm text-primary">{formatEUR(item.price)}</p>
            </div>
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9"
              onClick={() => addToCart(item)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Cart */}
      {cart.length > 0 && (
        <div className="rounded-xl border-2 border-primary bg-primary/5 p-3">
          <h3 className="mb-2 font-semibold">Vaše naročilo ({cartCount})</h3>
          <div className="space-y-1">
            {cart.map((c) => (
              <div key={c.menuItem.id} className="flex items-center justify-between text-sm">
                <span>{c.menuItem.name}</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-6 w-6"
                    onClick={() => updateQty(c.menuItem.id, -1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="min-w-6 text-center font-bold">{c.quantity}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-6 w-6"
                    onClick={() => updateQty(c.menuItem.id, 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <span className="ml-2 font-medium">{formatEUR(c.menuItem.price * c.quantity)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between border-t pt-2 font-bold">
            <span>Skupaj</span>
            <span className="text-primary">{formatEUR(cartTotal)}</span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            +{Math.floor(cartTotal / 10)} točk zvestobe
          </div>
          <Button
            className="mt-3 w-full"
            size="lg"
            onClick={submitOrder}
            disabled={submitting || !pickupTime}
          >
            {submitting ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Utensils className="mr-1.5 h-4 w-4" />
            )}
            {submitting ? "Naročam..." : `Naroči · ${formatEUR(cartTotal)}`}
          </Button>
          {!pickupTime && (
            <p className="mt-1 text-center text-xs text-amber-600">
              Izberi čas prevzema
            </p>
          )}
        </div>
      )}
    </div>
  );
}
