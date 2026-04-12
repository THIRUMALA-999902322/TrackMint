import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

const CACHE_KEY = "dashboard:sectors";
const CACHE_TTL = 600; // 10 minutes

interface SectorData {
  symbol: string;
  name: string;
  changePercent: number;
}

const SECTORS = [
  { symbol: "XLK", name: "Tech" },
  { symbol: "XLF", name: "Finance" },
  { symbol: "XLE", name: "Energy" },
  { symbol: "XLV", name: "Health" },
  { symbol: "XLY", name: "Consumer" },
  { symbol: "XLI", name: "Industrial" },
  { symbol: "XLC", name: "Comms" },
  { symbol: "XLRE", name: "Real Estate" },
];

const FALLBACK: SectorData[] = [
  { symbol: "XLK", name: "Tech", changePercent: 0.85 },
  { symbol: "XLF", name: "Finance", changePercent: -0.32 },
  { symbol: "XLE", name: "Energy", changePercent: 1.21 },
  { symbol: "XLV", name: "Health", changePercent: 0.15 },
  { symbol: "XLY", name: "Consumer", changePercent: -0.67 },
  { symbol: "XLI", name: "Industrial", changePercent: 0.44 },
  { symbol: "XLC", name: "Comms", changePercent: -0.18 },
  { symbol: "XLRE", name: "Real Estate", changePercent: -0.92 },
];

async function fetchSector(symbol: string, name: string): Promise<SectorData | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
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
      changePercent: Math.round(changePercent * 100) / 100,
    };
  } catch (e) {
    console.error(`Failed to fetch sector ${symbol}:`, e);
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

    const results = await Promise.all(
      SECTORS.map((s) => fetchSector(s.symbol, s.name))
    );

    const data = results.map((r, i) => r ?? FALLBACK[i]);

    await redis
      .set(CACHE_KEY, JSON.stringify(data), { ex: CACHE_TTL })
      .catch(() => {});

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Sectors error:", error);
    return NextResponse.json({ data: FALLBACK });
  }
}
