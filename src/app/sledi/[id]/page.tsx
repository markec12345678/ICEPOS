"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { formatEUR } from "@/lib/types";

interface OrderStatus {
  orderId: string;
  status: "received" | "preparing" | "ready" | "paid";
  orderStatus: string;
  table: string;
  total: number;
  itemCount: number;
  items: { name: string; quantity: number }[];
  createdAt: string;
  paidAt: string | null;
  isGuestOrder: boolean;
}

const STATUS_STEPS = [
  {
    key: "received",
    label: "Prejeto",
    icon: "📝",
    desc: "Vaše naročilo je bilo prejeto",
  },
  {
    key: "preparing",
    label: "V pripravi",
    icon: "👨‍🍳",
    desc: "Kuhinja pripravlja vaše naročilo",
  },
  {
    key: "ready",
    label: "Pripravljeno",
    icon: "✅",
    desc: "Vaše naročilo je pripravljeno!",
  },
  {
    key: "paid",
    label: "Zaključeno",
    icon: "💳",
    desc: "Hvala za obisk!",
  },
] as const;

export default function GuestTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Poll vsakih 5s za live update
  useEffect(() => {
    let active = true;

    async function fetchStatus() {
      try {
        const res = await fetch(`/api/orders/guest/${id}/status`);
        if (!res.ok) throw new Error();
        const json = (await res.json()) as OrderStatus;
        if (active) {
          setData(json);
          setLoading(false);
        }
      } catch {
        if (active) {
          setError(true);
          setLoading(false);
        }
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id]);

  // Timer za elapsed time
  useEffect(() => {
    if (!data) return;
    const update = () => {
      const ms = Date.now() - new Date(data.createdAt).getTime();
      setElapsed(Math.floor(ms / 1000));
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center", fontFamily: "sans-serif" }}>
        <div style={{ fontSize: 48 }}>⏳</div>
        <p style={{ marginTop: 16, color: "#666" }}>Nalagam status naročila...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: 60, textAlign: "center", fontFamily: "sans-serif" }}>
        <div style={{ fontSize: 48 }}>❌</div>
        <h2 style={{ marginTop: 16, fontSize: 20, fontWeight: 700 }}>
          Naročilo ni najdeno
        </h2>
        <p style={{ marginTop: 8, color: "#666" }}>
          Preverite povezavo ali skenirajte QR kodo znova.
        </p>
      </div>
    );
  }

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === data.status);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 600, margin: "0 auto", padding: 16 }}>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #f59e0b, #ea580c)",
          color: "white",
          padding: "24px 16px",
          borderRadius: "0 0 24px 24px",
          textAlign: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Sledenje naročila</h1>
        <p style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
          Št: {data.orderId.slice(-8).toUpperCase()} · {data.table}
        </p>
        {data.status !== "paid" && (
          <div
            style={{
              display: "inline-block",
              marginTop: 8,
              background: "rgba(255,255,255,0.2)",
              padding: "4px 12px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            ⏱️ {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>
        )}
      </div>

      {/* Progress steps */}
      <div style={{ marginBottom: 32 }}>
        {STATUS_STEPS.map((step, i) => {
          const isDone = i < currentStepIndex;
          const isActive = i === currentStepIndex;
          const isFuture = i > currentStepIndex;

          return (
            <div
              key={step.key}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
                marginBottom: 8,
              }}
            >
              {/* Connector + circle */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                {i > 0 && (
                  <div
                    style={{
                      width: 2,
                      height: 24,
                      background: isDone ? "#16a34a" : "#e5e7eb",
                    }}
                  />
                )}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    background: isDone
                      ? "#dcfce7"
                      : isActive
                      ? "#fef3c7"
                      : "#f3f4f6",
                    border: isActive
                      ? "3px solid #f59e0b"
                      : isDone
                      ? "3px solid #16a34a"
                      : "3px solid #e5e7eb",
                    transition: "all 0.3s",
                    animation: isActive ? "pulse 2s infinite" : "none",
                  }}
                >
                  {isDone ? "✓" : step.icon}
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div
                    style={{
                      width: 2,
                      height: 32,
                      background: isDone ? "#16a34a" : "#e5e7eb",
                    }}
                  />
                )}
              </div>

              {/* Text */}
              <div style={{ flex: 1, paddingTop: i === 0 ? 0 : 24 }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: isActive ? 800 : isDone ? 600 : 400,
                    color: isFuture ? "#9ca3af" : "#1a1a1a",
                  }}
                >
                  {step.label}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: isFuture ? "#9ca3af" : "#666",
                    marginTop: 2,
                  }}
                >
                  {isActive ? step.desc : isDone ? "Opravljeno" : "Na čakanju"}
                </div>
                {isActive && data.status === "preparing" && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "8px 12px",
                      background: "#fef3c7",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#92400e",
                    }}
                  >
                    👨‍🍳 Kuharji pripravljajo vaše naročilo. Prosim počakajte še
                    nekaj minut.
                  </div>
                )}
                {isActive && data.status === "ready" && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "8px 12px",
                      background: "#dcfce7",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#065f46",
                    }}
                  >
                    ✅ Vaše naročilo je pripravljeno! Natakar ga bo prinesel.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Order details */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          marginBottom: 16,
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#92400e" }}>
          📋 Vaše naročilo ({data.itemCount})
        </h3>
        {data.items.map((it, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: i < data.items.length - 1 ? "1px solid #f3f4f6" : "none",
            }}
          >
            <span style={{ fontSize: 14 }}>
              {it.quantity}× {it.name}
            </span>
          </div>
        ))}
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "2px solid #fde68a",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontWeight: 700 }}>Skupaj</span>
          <span style={{ fontWeight: 800, color: "#ea580c", fontSize: 18 }}>
            {formatEUR(data.total)}
          </span>
        </div>
      </div>

      {/* Auto-refresh hint */}
      {data.status !== "paid" && (
        <p style={{ textAlign: "center", fontSize: 12, color: "#9ca3af" }}>
          🔄 Status se samodejno osvežuje vsakih 5 sekund
        </p>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
