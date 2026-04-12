import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

const CACHE_KEY = "dashboard:market-indices";
const CACHE_TTL = 300; // 5 minutes

interface IndexData {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

const INDICES = [
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", name: "NASDAQ" },
  { symbol: "^DJI", name: "Dow Jones" },
  { symbol: "BTC-USD", name: "Bitcoin" },
  { symbol: "GC=F", name: "Gold" },
];

const FALLBACK: IndexData[] = [
  { symbol: "^GSPC", name: "S&P 500", value: 5248.49, change: 15.29, changePercent: 0.29 },
  { symbol: "^IXIC", name: "NASDAQ", value: 16399.52, change: -42.1, changePercent: -0.26 },
  { symbol: "^DJI", name: "Dow Jones", value: 39127.14, change: 75.66, changePercent: 0.19 },
  { symbol: "BTC-USD", name: "Bitcoin", value: 67523.41, change: -1420.32, changePercent: -2.06 },
  { symbol: "GC=F", name: "Gold", value: 2338.4, change: 8.2, changePercent: 0.35 },
];

async function fetchIndex(symbol: string, name: string): Promise<IndexData | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const currentPrice = meta.regularMarketPrice ?? 0;
    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? currentPrice;
    const change = currentPrice - previousClose;
    const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

    return {
      symbol,
      name,
      value: currentPrice,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
    };
  } catch (e) {
    console.error(`Failed to fetch index ${symbol}:`, e);
    return null;
  }
}

export async function GET() {
  try {
    // Check cache
    const cached = await redis.get(CACHE_KEY).catch(() => null);
    if (cached) {
      const data = typeof cached === "string" ? JSON.parse(cached) : cached;
      return NextResponse.json({ data });
    }

    // Fetch all indices in parallel
    const results = await Promise.all(
      INDICES.map((idx) => fetchIndex(idx.symbol, idx.name))
    );

    const data = results.map((r, i) => r ?? FALLBACK[i]);

    // Cache result
    await redis
      .set(CACHE_KEY, JSON.stringify(data), { ex: CACHE_TTL })
      .catch(() => {});

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Market indices error:", error);
    return NextResponse.json({ data: FALLBACK });
  }
}
