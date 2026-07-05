// ICEPOS Kuhinja Display Service (KDS)
// Real-time prikaz naročil v kuhinji prek WebSocket
//
// Port: 3003 (Caddy forwarda prek /?XTransformPort=3003)
//
// Faza 3 izboljšave:
// - Redis adapter za horizontalno skaliranje (multi-instance)
// - Socket.io auth (KITCHEN_API_KEY env var)
// - /health HTTP endpoint za Docker healthcheck
// - CORS omejen na APP_URL (ne "*")
// - Graceful shutdown

import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

// === Konfiguracija ===
const PORT = parseInt(process.env.PORT || "3003", 10);
const KITCHEN_API_KEY = process.env.KITCHEN_API_KEY;
const REDIS_URL = process.env.REDIS_URL;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// === HTTP server (za /health) ===
const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      service: "kitchen",
      port: PORT,
      uptime: process.uptime(),
      activeOrders: activeOrders.size,
      redis: REDIS_URL ? "connected" : "disabled",
    }));
    return;
  }
  res.writeHead(404);
  res.end("Not found");
});

// === Socket.io server ===
const io = new Server(httpServer, {
  path: "/",
  cors: {
    origin: APP_URL.split(","),
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// === Redis adapter (optional — za multi-instance) ===
async function setupRedis() {
  if (!REDIS_URL) {
    console.log("[kitchen] Redis URL ni nastavljen — uporabljam in-memory (single-instance)");
    return;
  }
  try {
    const pubClient = createClient({ url: REDIS_URL });
    const subClient = pubClient.duplicate();
    await pubClient.connect();
    await subClient.connect();
    io.adapter(createAdapter(pubClient, subClient));
    console.log("[kitchen] Redis adapter povezan — multi-instance podpora aktivna");
  } catch (e) {
    console.error("[kitchen] Redis povezava ni uspela, fallback na in-memory:", e);
  }
}

// === Tipi ===
export interface KitchenItem {
  menuItemId: string;
  name: string;
  quantity: number;
  note?: string | null;
}

export interface KitchenOrder {
  id: string;
  orderId: string;
  tableNumber: number;
  tableName: string;
  items: KitchenItem[];
  status: "new" | "preparing" | "ready" | "served";
  createdAt: string;
  updatedAt: string;
  operator: string;
  priority?: boolean;
}

// === In-memory store (fallback če Redis ni na voljo) ===
const activeOrders = new Map<string, KitchenOrder>();

function emitStats() {
  const stats = {
    new: 0,
    preparing: 0,
    ready: 0,
    total: activeOrders.size,
  };
  for (const o of activeOrders.values()) {
    if (o.status === "new") stats.new++;
    else if (o.status === "preparing") stats.preparing++;
    else if (o.status === "ready") stats.ready++;
  }
  io.emit("kitchen:stats", stats);
  return stats;
}

// === Socket.io auth middleware ===
io.use((socket, next) => {
  // Če KITCHEN_API_KEY ni nastavljen, dovoli vse (dev mode)
  if (!KITCHEN_API_KEY) {
    return next();
  }
  const token = socket.handshake.auth?.token || socket.handshake.headers?.["x-kitchen-key"];
  if (token !== KITCHEN_API_KEY) {
    console.warn(`[kitchen] Avtentikacija zavrnjena za socket ${socket.id}`);
    return next(new Error("Neveljaven API ključ"));
  }
  next();
});

// === Connection handler ===
io.on("connection", (socket) => {
  console.log(`[kitchen] Povezan: ${socket.id}`);

  // Ob povezavi pošlji vsa odprta naročila (sync)
  const openOrders = Array.from(activeOrders.values()).filter(
    (o) => o.status !== "served"
  );
  socket.emit("kitchen:sync", openOrders);
  emitStats();

  // Blagajna pošlje novo naročilo v kuhinjo
  socket.on("order:new", (order: KitchenOrder) => {
    console.log(
      `[kitchen] Novo naročilo: Miza ${order.tableName} (${order.items.length} postavk)`
    );
    order.status = "new";
    order.updatedAt = new Date().toISOString();
    activeOrders.set(order.id, order);
    io.emit("order:new", order);
    emitStats();
  });

  // Kuhinja spremeni status naročila
  socket.on(
    "order:status",
    (data: { orderId: string; status: KitchenOrder["status"] }) => {
      const order = activeOrders.get(data.orderId);
      if (!order) {
        socket.emit("error", { message: "Naročilo ni najdeno" });
        return;
      }
      order.status = data.status;
      order.updatedAt = new Date().toISOString();
      console.log(
        `[kitchen] Status ${order.tableName}: ${data.status}`
      );
      io.emit("order:status", {
        orderId: order.id,
        status: order.status,
        updatedAt: order.updatedAt,
      });
      emitStats();

      // Če je served, odstrani po 30s (za zgodovino)
      if (data.status === "served") {
        setTimeout(() => {
          activeOrders.delete(data.orderId);
        }, 30000);
      }
    }
  );

  // Kuhinja pokliče nazaj (npr. "miza 3, jed pripravljena")
  socket.on(
    "order:recall",
    (data: { orderId: string; tableName: string; item?: string }) => {
      console.log(`[kitchen] Klic: Miza ${data.tableName}`);
      io.emit("order:recall", data);
    }
  );

  // Zahteva po statistiki
  socket.on("kitchen:stats:request", () => {
    socket.emit("kitchen:stats", emitStats());
  });

  socket.on("disconnect", () => {
    console.log(`[kitchen] Prekinjen: ${socket.id}`);
  });

  socket.on("error", (error) => {
    console.error(`[kitchen] Socket napaka (${socket.id}):`, error);
  });
});

// === Startup ===
setupRedis().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Kitchen Service na portu ${PORT} (Redis: ${REDIS_URL ? "on" : "off"}, Auth: ${KITCHEN_API_KEY ? "on" : "off"})`);
  });
});

// === Graceful shutdown ===
process.on("SIGTERM", () => {
  console.log("[kitchen] SIGTERM, ugašam...");
  io.close();
  httpServer.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  console.log("[kitchen] SIGINT, ugašam...");
  io.close();
  httpServer.close(() => process.exit(0));
});
