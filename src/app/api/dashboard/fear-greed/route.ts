import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

const CACHE_KEY = "dashboard:fear-greed";
const CACHE_TTL = 3600; // 1 hour

interface FearGreedData {
  value: number;
  classification: string;
}

const FALLBACK: FearGreedData = { value: 45, classification: "Neutral" };

export async function GET() {
  try {
    // Check cache
    const cached = await redis.get(CACHE_KEY).catch(() => null);
    if (cached) {
      const data = typeof cached === "string" ? JSON.parse(cached) : cached;
      return NextResponse.json({ data });
    }

    const res = await fetch("https://api.alternative.me/fng/?limit=1", {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ data: FALLBACK });
    }

    const json = await res.json();
    const entry = json?.data?.[0];

    const data: FearGreedData = entry
      ? {
          value: parseInt(entry.value, 10),
          classification: entry.value_classification || "Unknown",
        }
      : FALLBACK;

    await redis
      .set(CACHE_KEY, JSON.stringify(data), { ex: CACHE_TTL })
      .catch(() => {});

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Fear & Greed error:", error);
    return NextResponse.json({ data: FALLBACK });
  }
}
