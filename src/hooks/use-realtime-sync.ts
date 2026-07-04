"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { playFeedbackSound } from "@/hooks/use-sound-feedback";

export type ConnectionState = "connected" | "connecting" | "disconnected" | "reconnecting" | "fallback";

interface RealtimeSyncOptions {
  /** Port za WebSocket mini-service */
  port: number;
  /** Eventi za poslušat (mapa event → handler) */
  handlers: Record<string, (data: unknown) => void>;
  /** HTTP polling fallback URL (pridobi podatke ko WS ne deluje) */
  fallbackUrl?: string;
  /** Polling interval v ms (default 10000) */
  fallbackInterval?: number;
  /** Maksimalno število reconnection poskusov (default Infinity) */
  maxReconnectAttempts?: number;
  /** Auto-recovery toast obvestilo (default true) */
  notifyRecovery?: boolean;
}

interface RealtimeSyncResult {
  state: ConnectionState;
  connected: boolean;
  reconnect: () => void;
  emit: (event: string, data: unknown) => void;
  lastEventTime: number | null;
  reconnectAttempts: number;
}

/**
 * Robustni WebSocket hook z:
 * - Exponential backoff (1s → 2s → 4s → 8s → 16s → 30s max)
 * - HTTP polling fallback ko WS pade
 * - Heartbeat health check
 * - Auto-recovery notification
 * - Infinite reconnection (ne preneha po N poskusih)
 */
export function useRealtimeSync({
  port,
  handlers,
  fallbackUrl,
  fallbackInterval = 10000,
  maxReconnectAttempts = Infinity,
  notifyRecovery = true,
}: RealtimeSyncOptions): RealtimeSyncResult {
  const [state, setState] = useState<ConnectionState>("connecting");
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastEventTime, setLastEventTime] = useState<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const backoffTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handlersRef = useRef(handlers);
  const wasConnectedRef = useRef(false);

  // Update handlers ref brez re-render
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Exponential backoff
  const getBackoffDelay = useCallback((attempt: number): number => {
    const base = 1000; // 1s
    const max = 30000; // 30s max
    const delay = Math.min(base * Math.pow(2, attempt), max);
    // Dodaj malo jitterja (0-500ms) da preprečimo thundering herd
    return delay + Math.random() * 500;
  }, []);

  // HTTP polling fallback
  const startFallback = useCallback(() => {
    if (!fallbackUrl || fallbackIntervalRef.current) return;

    setState("fallback");
    toast.warning("WebSocket povezava padla", {
      description: "Preklop na HTTP polling — naročila se osvežujejo vsakih 10s",
      duration: 5000,
    });

    const poll = async () => {
      try {
        const res = await fetch(fallbackUrl);
        if (res.ok) {
          const data = await res.json();
          // Klici handler za sync
          const syncHandler = handlersRef.current["kitchen:sync"];
          if (syncHandler && Array.isArray(data)) {
            syncHandler(data);
          }
          setLastEventTime(Date.now());
        }
      } catch {
        // Tiha napaka — poskusimo znova naslednji cikel
      }
    };

    poll(); // Takoj prvič
    fallbackIntervalRef.current = setInterval(poll, fallbackInterval);
  }, [fallbackUrl, fallbackInterval]);

  const stopFallback = useCallback(() => {
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
  }, []);

  // Ref za scheduleReconnect (da se izognemo circular dependency)
  const scheduleReconnectRef = useRef<() => void>(() => {});

  // Glavna connect funkcija
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const isDev = typeof window !== "undefined" && window.location.port === "3000";
    const socketUrl = isDev
      ? `${window.location.protocol}//${window.location.hostname}:81`
      : "";

    setState(reconnectAttempts > 0 ? "reconnecting" : "connecting");

    const s = io(`${socketUrl}/?XTransformPort=${port}`, {
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: false, // Upravljamo ročno za boljši nadzor
      timeout: 10000,
    });

    socketRef.current = s;

    s.on("connect", () => {
      setState("connected");
      setReconnectAttempts(0);
      stopFallback();

      if (wasConnectedRef.current && notifyRecovery) {
        playFeedbackSound("success");
        toast.success("Povezava obnovljena!", {
          description: "Real-time sinhronizacija je spet aktivna",
          duration: 3000,
        });
      }
      wasConnectedRef.current = true;
      setLastEventTime(Date.now());
    });

    s.on("disconnect", (reason: string) => {
      setState("disconnected");

      // io server disconnect ali transport close — poskusi ponovno
      if (reason === "io server disconnect") {
        // Server nas je odklopil — ne poskusi samodejno
        return;
      }

      // Začni reconnection z exponential backoff
      scheduleReconnectRef.current();
    });

    s.on("connect_error", () => {
      setState("disconnected");
      scheduleReconnectRef.current();
    });

    // Registriraj vse handlerje
    for (const [event, handler] of Object.entries(handlersRef.current)) {
      s.on(event, (data: unknown) => {
        handler(data);
        setLastEventTime(Date.now());
      });
    }
  }, [port, reconnectAttempts, stopFallback, notifyRecovery]);

  // Schedule reconnection z exponential backoff
  const scheduleReconnect = useCallback(() => {
    setReconnectAttempts((prev) => {
      const next = prev + 1;

      if (next > maxReconnectAttempts) {
        // Preklopi na HTTP polling fallback
        startFallback();
        return next;
      }

      const delay = getBackoffDelay(next - 1);
      setState("reconnecting");

      // Po 3 neuspešnih poskusih začni fallback vzporedno
      if (next === 3 && fallbackUrl) {
        startFallback();
      }

      // Clear prejšnji timeout
      if (backoffTimeoutRef.current) {
        clearTimeout(backoffTimeoutRef.current);
      }

      backoffTimeoutRef.current = setTimeout(() => {
        // Počisti staro povezavo
        if (socketRef.current) {
          socketRef.current.removeAllListeners();
          socketRef.current.close();
          socketRef.current = null;
        }
        connect();
      }, delay);

      return next;
    });
  }, [maxReconnectAttempts, getBackoffDelay, startFallback, fallbackUrl, connect]);

  // Update ref za scheduleReconnect
  useEffect(() => {
    scheduleReconnectRef.current = scheduleReconnect;
  }, [scheduleReconnect]);

  // Heartbeat health check — če ni dogodkov 60s, preveri povezavo
  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      if (state === "connected" && lastEventTime) {
        const silence = Date.now() - lastEventTime;
        if (silence > 60000) {
          // 60s brez dogodkov — pošlji ping
          if (socketRef.current?.connected) {
            socketRef.current.emit("ping");
            setLastEventTime(Date.now());
          }
        }
      }
    }, 30000); // Preverjaj vsakih 30s

    return () => clearInterval(heartbeatInterval);
  }, [state, lastEventTime]);

  // Inicializacija
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    connect();

    return () => {
      if (backoffTimeoutRef.current) {
        clearTimeout(backoffTimeoutRef.current);
      }
      stopFallback();
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect]);

  // emit funkcija
  const emit = useCallback((event: string, data: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      // Če WS ne deluje, poskusi prek HTTP
      console.warn(`[RealtimeSync] WS ni povezan — emit ${event} ignoriran`);
    }
  }, []);

  // Ročni reconnect
  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.close();
      socketRef.current = null;
    }
    stopFallback();
    setReconnectAttempts(0);
    connect();
  }, [connect, stopFallback]);

  return {
    state,
    connected: state === "connected",
    reconnect,
    emit,
    lastEventTime,
    reconnectAttempts,
  };
}
