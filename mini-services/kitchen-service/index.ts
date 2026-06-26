// ICEPOS Kuhinja Display Service (KOT)
// Real-time prikaz naročil v kuhinji prek WebSocket
//
// Port: 3003 (Caddy forwarda prek /?XTransformPort=3003)
//
// Eventi:
// - order:new      → novo naročilo iz blagajne
// - order:status   → sprememba statusa (new → preparing → ready → served)
// - order:recall   → klic nazaj (popup na blagajni)
// - kitchen:sync   → full sync ob povezavi (pošlje vsa odprta naročila)
// - kitchen:stats  → statistika (koliko v pripravi, koliko ready)

import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

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

// In-memory store odprtih naročil (v produkciji: Redis ali DB)
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

const PORT = 3003;
httpServer.listen(PORT, () => {
  console.log(`🍳 ICEPOS Kitchen Service na portu ${PORT}`);
});

process.on("SIGTERM", () => {
  console.log("[kitchen] SIGTERM, ugašam...");
  httpServer.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  console.log("[kitchen] SIGINT, ugašam...");
  httpServer.close(() => process.exit(0));
});
