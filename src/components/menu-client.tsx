"use client";

import { useState, useEffect } from "react";
import { formatEUR, type MenuItem, CATEGORIES } from "@/lib/types";
import { Star, UtensilsCrossed, ShoppingCart } from "lucide-react";

interface MenuClientProps {
  items: MenuItem[];
  tableNumber?: string;
  reservations: { time: string; tableName: string; partySize: number }[];
  issuer: {
    name: string;
    naslov: string;
    posta: string;
    kraj: string;
    taxNumber: string;
  };
}

export function MenuClient({ items, tableNumber, reservations, issuer }: MenuClientProps) {
  const [cart, setCart] = useState<{ menuItem: MenuItem; quantity: number }[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [addedFlash, setAddedFlash] = useState<Set<string>>(new Set());

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItem.id === item.id
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
    // Flash animacija
    setAddedFlash((prev) => new Set(prev).add(item.id));
    setTimeout(() => {
      setAddedFlash((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 1200);
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((c) => c.menuItem.id !== id));
  }

  function changeQty(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) =>
          c.menuItem.id === id ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  }

  const total = cart.reduce((s, c) => s + c.menuItem.price * c.quantity, 0);
  const itemCount = cart.reduce((s, c) => s + c.quantity, 0);

  async function submitOrder() {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber,
          customerName: customerName.trim() || undefined,
          items: cart.map((c) => ({
            menuItemId: c.menuItem.id,
            quantity: c.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Napaka");
      setOrderId(data.orderId);
      setSuccess(true);
      setCart([]);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  // Success screen
  if (success) {
    return (
      <div style={{ textAlign: "center", padding: "60px 16px" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#16a34a" }}>
          Naročilo uspešno oddano!
        </h2>
        <p style={{ fontSize: 16, marginTop: 12, color: "#666" }}>
          Kuhinja ga bo kmalu pripravila. Prosimo počakajte.
        </p>
        <p style={{ fontSize: 14, marginTop: 8, color: "#999" }}>
          Št. naročila: {orderId?.slice(-8).toUpperCase()}
        </p>
        <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href={`/sledi/${orderId}`}
            style={{
              background: "#0ea5e9",
              color: "white",
              border: "none",
              padding: "12px 32px",
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            📍 Sledi naročilu
          </a>
          <button
            onClick={() => {
              setSuccess(false);
              setOrderId(null);
            }}
            style={{
              background: "#f59e0b",
              color: "white",
              border: "none",
              padding: "12px 32px",
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ← Nazaj na meni
          </button>
        </div>
      </div>
    );
  }

  const dailySpecials = items.filter((m) => m.isDailySpecial);
  const favorites = items.filter((m) => m.isFavorite);

  return (
    <>
      {/* Floating cart button */}
      {cart.length > 0 && (
        <button
          onClick={() =>
            document
              .getElementById("guest-cart")
              ?.scrollIntoView({ behavior: "smooth" })
          }
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            background: "#f59e0b",
            color: "white",
            border: "none",
            borderRadius: 50,
            padding: "16px 24px",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(245,158,11,0.4)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <ShoppingCart size={20} />
          {itemCount} · {formatEUR(total)}
        </button>
      )}

      {/* Order hint */}
      <div
        style={{
          background: "#ecfdf5",
          border: "1px solid #6ee7b7",
          borderRadius: 12,
          padding: "12px 16px",
          margin: "16px 0",
          fontSize: 13,
          color: "#065f46",
          textAlign: "center",
        }}
      >
        📱 Izberite jedi spodaj in kliknite <strong>"Oddaj naročilo"</strong> —
        kuhinja ga bo kmalu pripravila!
      </div>

      {/* Dnevna ponudba */}
      {dailySpecials.length > 0 && (
        <Section title="Dnevna ponudba" icon="🍽️">
          {dailySpecials.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onAdd={() => addToCart(item)}
              added={addedFlash.has(item.id)}
            />
          ))}
        </Section>
      )}

      {/* Priljubljene */}
      {favorites.length > 0 && (
        <Section title="Priljubljene" icon="⭐">
          {favorites.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onAdd={() => addToCart(item)}
              added={addedFlash.has(item.id)}
            />
          ))}
        </Section>
      )}

      {/* Kategorije */}
      {CATEGORIES.map((cat) => {
        const catItems = items.filter((m) => m.category === cat.id);
        if (catItems.length === 0) return null;
        return (
          <Section key={cat.id} title={cat.label} icon={cat.icon}>
            {catItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onAdd={() => addToCart(item)}
                added={addedFlash.has(item.id)}
              />
            ))}
          </Section>
        );
      })}

      {/* Rezervacije */}
      {reservations.length > 0 && (
        <div
          style={{
            background: "#eff6ff",
            borderRadius: 12,
            padding: 16,
            margin: "16px 0",
          }}
        >
          <h3 style={{ fontSize: 14, color: "#1e40af", marginBottom: 8 }}>
            📅 Današnje rezervacije
          </h3>
          {reservations.map((r, i) => (
            <p
              key={i}
              style={{ fontSize: 12, color: "#333", margin: "4px 0" }}
            >
              <strong>{r.time}</strong> — {r.tableName} ({r.partySize} oseb)
            </p>
          ))}
        </div>
      )}

      {/* Cart */}
      {cart.length > 0 && (
        <div
          id="guest-cart"
          style={{
            marginTop: 32,
            padding: 20,
            background: "white",
            borderRadius: 16,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#92400e",
              marginBottom: 16,
            }}
          >
            🛒 Vaše naročilo ({itemCount})
          </h3>

          {cart.map((c) => (
            <div
              key={c.menuItem.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 0",
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {c.menuItem.name}
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {formatEUR(c.menuItem.price)} × {c.quantity}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <QtyBtn label="−" onClick={() => changeQty(c.menuItem.id, -1)} />
                <span
                  style={{
                    minWidth: 24,
                    textAlign: "center",
                    fontWeight: 700,
                  }}
                >
                  {c.quantity}
                </span>
                <QtyBtn label="+" onClick={() => changeQty(c.menuItem.id, 1)} />
                <button
                  onClick={() => removeFromCart(c.menuItem.id)}
                  style={{
                    marginLeft: 8,
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: "none",
                    background: "#fef2f2",
                    color: "#dc2626",
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  ✕
                </button>
              </div>
              <div
                style={{
                  marginLeft: 12,
                  fontWeight: 700,
                  color: "#ea580c",
                  minWidth: 60,
                  textAlign: "right",
                }}
              >
                {formatEUR(c.menuItem.price * c.quantity)}
              </div>
            </div>
          ))}

          {/* Ime */}
          <div style={{ marginTop: 16 }}>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Vaše ime (opcijsko)"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 14,
              }}
            />
          </div>

          {/* Skupaj + oddaj */}
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: "2px solid #fde68a",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: "#666" }}>Skupaj</div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "#ea580c",
                }}
              >
                {formatEUR(total)}
              </div>
            </div>
            <button
              onClick={submitOrder}
              disabled={submitting}
              style={{
                background: "#16a34a",
                color: "white",
                border: "none",
                padding: "14px 32px",
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 700,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? "Oddajam..." : "✅ Oddaj naročilo"}
            </button>
          </div>

          {tableNumber && (
            <p
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "#666",
                textAlign: "center",
              }}
            >
              Naročilo bo povezano z mizo {tableNumber}
            </p>
          )}
        </div>
      )}
    </>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ margin: "24px 0" }}>
      <h3
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#92400e",
          borderBottom: "2px solid #fde68a",
          paddingBottom: 8,
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span>{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function ItemCard({
  item,
  onAdd,
  added,
}: {
  item: MenuItem;
  onAdd: () => void;
  added: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: 12,
        background: "white",
        borderRadius: 12,
        marginBottom: 8,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          {item.name}
          {item.isFavorite && <Badge text="⭐" bg="#fef3c7" color="#92400e" />}
          {item.isDailySpecial && (
            <Badge text="DANA" bg="#fecdd3" color="#9f1239" />
          )}
        </div>
        {item.desc && (
          <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
            {item.desc}
          </div>
        )}
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#ea580c",
            marginTop: 4,
          }}
        >
          {formatEUR(item.price)}
        </div>
      </div>
      <button
        onClick={onAdd}
        style={{
          background: added ? "#16a34a" : "#f59e0b",
          color: "white",
          border: "none",
          borderRadius: 8,
          padding: "8px 16px",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          marginLeft: 12,
          whiteSpace: "nowrap",
          transition: "background 0.2s",
        }}
      >
        {added ? "✓ Dodano" : "+ Dodaj"}
      </button>
    </div>
  );
}

function Badge({
  text,
  bg,
  color,
}: {
  text: string;
  bg: string;
  color: string;
}) {
  return (
    <span
      style={{
        background: bg,
        color: color,
        fontSize: 10,
        padding: "2px 6px",
        borderRadius: 8,
        fontWeight: 600,
      }}
    >
      {text}
    </span>
  );
}

function QtyBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        border: "1px solid #e5e7eb",
        background: "white",
        cursor: "pointer",
        fontSize: 16,
      }}
    >
      {label}
    </button>
  );
}
