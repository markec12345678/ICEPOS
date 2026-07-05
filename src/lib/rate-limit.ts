import { createClient, type RedisClientType } from "redis";

// ============================================================
// RATE LIMITING — Redis-backed (produkcija) z in-memory fallback (dev)
// ============================================================
// V produkciji: nastavi REDIS_URL env var → uporabi Redis
// V dev: brez REDIS_URL → uporabi in-memory Map (single-instance only)

interface RateLimitEntry {
  count: number;
  firstAttemptAt: number;
}

const inMemoryStore = new Map<string, RateLimitEntry>();
let redisClient: RedisClientType | null = null;
let redisConnected = false;

async function getRedis(): Promise<RedisClientType | null> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  if (!redisClient) {
    redisClient = createClient({ url: redisUrl }) as RedisClientType;
    redisClient.on("error", (err: Error) => {
      console.error("[redis] Error:", err.message);
      redisConnected = false;
    });
  }

  if (!redisConnected) {
    try {
      await redisClient.connect();
      redisConnected = true;
    } catch (err) {
      console.warn("[redis] Connection failed, falling back to in-memory:", (err as Error).message);
      return null;
    }
  }

  return redisClient;
}

export interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const redis = await getRedis();

  if (redis) {
    const redisKey = `ratelimit:${key}`;
    const data = await redis.get(redisKey);

    if (data) {
      const entry = JSON.parse(data) as RateLimitEntry;
      if (now - entry.firstAttemptAt > config.windowMs) {
        await redis.set(redisKey, JSON.stringify({ count: 1, firstAttemptAt: now }), { PX: config.windowMs });
        return { allowed: true, remaining: config.maxAttempts - 1, retryAfterMs: 0 };
      }
      if (entry.count >= config.maxAttempts) {
        const retryAfterMs = config.windowMs - (now - entry.firstAttemptAt);
        return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, retryAfterMs) };
      }
      entry.count++;
      await redis.set(redisKey, JSON.stringify(entry), { PX: config.windowMs });
      return { allowed: true, remaining: config.maxAttempts - entry.count, retryAfterMs: 0 };
    } else {
      await redis.set(redisKey, JSON.stringify({ count: 1, firstAttemptAt: now }), { PX: config.windowMs });
      return { allowed: true, remaining: config.maxAttempts - 1, retryAfterMs: 0 };
    }
  }

  // In-memory fallback (dev mode)
  const entry = inMemoryStore.get(key);
  if (entry) {
    if (now - entry.firstAttemptAt > config.windowMs) {
      inMemoryStore.set(key, { count: 1, firstAttemptAt: now });
      return { allowed: true, remaining: config.maxAttempts - 1, retryAfterMs: 0 };
    }
    if (entry.count >= config.maxAttempts) {
      const retryAfterMs = config.windowMs - (now - entry.firstAttemptAt);
      return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, retryAfterMs) };
    }
    entry.count++;
    return { allowed: true, remaining: config.maxAttempts - entry.count, retryAfterMs: 0 };
  }
  inMemoryStore.set(key, { count: 1, firstAttemptAt: now });
  return { allowed: true, remaining: config.maxAttempts - 1, retryAfterMs: 0 };
}

export async function resetRateLimit(key: string): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    await redis.del(`ratelimit:${key}`);
  } else {
    inMemoryStore.delete(key);
  }
}

// Clear in-memory store periodically (prevent memory leak in dev)
if (process.env.NODE_ENV !== "production") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of inMemoryStore.entries()) {
      if (now - entry.firstAttemptAt > 60 * 60 * 1000) {
        inMemoryStore.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}
