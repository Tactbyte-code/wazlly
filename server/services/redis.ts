import Redis from "ioredis";

let redisClient: Redis | null = null;
let connectionAttempted = false;
let isConnected = false;

// Subscribers notified whenever Redis flips between available / unavailable.
// Used by other services (e.g. MessageQueueService) to switch engines at
// runtime without restarting the process.
type RedisStateListener = (available: boolean) => void;
const redisStateListeners = new Set<RedisStateListener>();

export function onRedisStateChange(listener: RedisStateListener): () => void {
  redisStateListeners.add(listener);
  return () => redisStateListeners.delete(listener);
}

function emitRedisState(available: boolean): void {
  for (const listener of redisStateListeners) {
    try {
      listener(available);
    } catch (err) {
      console.error("[Redis] State listener threw:", (err as Error).message);
    }
  }
}

function initRedis(): Redis | null {
  if (connectionAttempted) return redisClient;
  connectionAttempted = true;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log("[Redis] REDIS_URL not set — running without Redis");
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 5) return null;
        return Math.min(times * 500, 3000);
      },
      lazyConnect: false,
    });

    redisClient.on("connect", () => {
      const wasConnected = isConnected;
      isConnected = true;
      console.log("[Redis] Connected successfully");
      if (!wasConnected) emitRedisState(true);
    });

    let redisErrorLogged = false;
    redisClient.on("error", (err: Error) => {
      if (!redisErrorLogged) {
        redisErrorLogged = true;
        console.error("[Redis] Connection error:", err.message);
      }
      const wasConnected = isConnected;
      isConnected = false;
      if (wasConnected) emitRedisState(false);
    });

    redisClient.on("close", () => {
      const wasConnected = isConnected;
      isConnected = false;
      if (wasConnected) emitRedisState(false);
    });
  } catch (err: any) {
    console.error("[Redis] Failed to initialize:", err.message);
    redisClient = null;
  }

  return redisClient;
}

export function getRedisClient(): Redis | null {
  if (!connectionAttempted) initRedis();
  return isConnected ? redisClient : null;
}

export function isRedisAvailable(): boolean {
  if (!connectionAttempted) initRedis();
  return isConnected && redisClient !== null;
}

export async function cacheGet(key: string): Promise<string | null> {
  const client = getRedisClient();
  if (!client) return null;
  try {
    return await client.get(key);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  try {
    if (ttlSeconds) {
      await client.set(key, value, "EX", ttlSeconds);
    } else {
      await client.set(key, value);
    }
    return true;
  } catch {
    return false;
  }
}

export async function cacheSetNX(key: string, value: string, ttlSeconds: number): Promise<boolean | null> {
  const client = getRedisClient();
  if (!client) return null;
  try {
    const result = await client.set(key, value, "EX", ttlSeconds, "NX");
    return result === "OK";
  } catch {
    return null;
  }
}

export async function cacheDel(key: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  try {
    await client.del(key);
    return true;
  } catch {
    return false;
  }
}

export async function cacheGetJSON<T>(key: string): Promise<T | null> {
  const raw = await cacheGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSetJSON(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
  try {
    return await cacheSet(key, JSON.stringify(value), ttlSeconds);
  } catch {
    return false;
  }
}
