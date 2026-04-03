import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

const PRICE_PREFIX = "price:";
const NEWS_PREFIX = "news:";

export async function getCachedPrice(symbol: string): Promise<any | null> {
  try {
    return await redis.get(`${PRICE_PREFIX}${symbol}`);
  } catch {
    return null;
  }
}

export async function setCachedPrice(symbol: string, data: any, ttlSeconds = 300): Promise<void> {
  try {
    await redis.set(`${PRICE_PREFIX}${symbol}`, JSON.stringify(data), { ex: ttlSeconds });
  } catch (e) {
    console.error("Redis set price error:", e);
  }
}

export async function getCachedNews(symbol: string): Promise<any[] | null> {
  try {
    const data = await redis.get(`${NEWS_PREFIX}${symbol}`);
    return data ? (typeof data === "string" ? JSON.parse(data) : data) as any[] : null;
  } catch {
    return null;
  }
}

export async function setCachedNews(symbol: string, data: any[], ttlSeconds = 1800): Promise<void> {
  try {
    await redis.set(`${NEWS_PREFIX}${symbol}`, JSON.stringify(data), { ex: ttlSeconds });
  } catch (e) {
    console.error("Redis set news error:", e);
  }
}
