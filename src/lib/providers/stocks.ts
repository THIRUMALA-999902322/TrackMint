import { MarketDataProvider, PriceData, AssetSearchResult, OHLCV } from "./types";
import { redis } from "@/lib/redis";

const BASE_URL = "https://finnhub.io/api/v1";

function getKey(): string {
  return process.env.FINNHUB_API_KEY || "";
}

async function finnhubFetch(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set("token", getKey());
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 300 } });
    if (!res.ok) {
      if (res.status === 429) console.error(`Finnhub RATE LIMIT on ${endpoint}`);
      else console.error(`Finnhub error: ${res.status} for ${endpoint}`);
      return null;
    }
    return res.json();
  } catch (e) {
    console.error("Finnhub fetch error:", e);
    return null;
  }
}

// Fetch the public Yahoo v8 chart endpoint as a fallback when Finnhub fails
// or returns a 0 price (rate-limit, regional symbol, etc.).
async function yahooQuote(symbol: string): Promise<{ price: number; changePercent: number } | null> {
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta?.regularMarketPrice) return null;
    const prev = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice;
    const changePercent = prev > 0 ? ((meta.regularMarketPrice - prev) / prev) * 100 : 0;
    return { price: meta.regularMarketPrice, changePercent };
  } catch {
    return null;
  }
}

// Fetch and cache the company logo url from Finnhub profile2.
// Cached in Redis for 7 days (key: logo:<symbol>).
async function fetchLogo(symbol: string): Promise<string | undefined> {
  const key = `logo:${symbol.toUpperCase()}`;
  try {
    const cached = await redis.get<string>(key);
    if (cached) return cached;
  } catch {}

  const data = await finnhubFetch("/stock/profile2", { symbol: symbol.toUpperCase() });
  const logo: string | undefined = data?.logo;
  if (logo) {
    try {
      await redis.set(key, logo, { ex: 60 * 60 * 24 * 7 });
    } catch {}
  }
  return logo;
}

export class StocksProvider implements MarketDataProvider {
  async getPrice(symbol: string): Promise<PriceData | null> {
    const upper = symbol.toUpperCase();
    const data = await finnhubFetch("/quote", { symbol: upper });

    let price = data?.c || 0;
    let changePercent = data?.dp || 0;
    let change = data?.d || 0;
    let high = data?.h || 0;
    let low = data?.l || 0;

    // Fallback to Yahoo when Finnhub returns null/0 (rate-limit or regional symbol).
    if (!price || price === 0) {
      const y = await yahooQuote(upper);
      if (!y) return null;
      price = y.price;
      changePercent = y.changePercent;
      change = 0;
      high = 0;
      low = 0;
    }

    // Fetch logo lazily; don't block price on it (fire-and-forget also OK,
    // but we await briefly so the first response has it).
    const logo = await fetchLogo(upper).catch(() => undefined);

    return {
      symbol: upper,
      price,
      change24h: change,
      changePercent24h: changePercent,
      high24h: high,
      low24h: low,
      volume24h: 0,
      lastUpdated: new Date().toISOString(),
      logo,
    };
  }

  async getPrices(symbols: string[]): Promise<PriceData[]> {
    const results: PriceData[] = [];
    const batchSize = 5;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const promises = batch.map((s) => this.getPrice(s));
      const batchResults = await Promise.all(promises);
      batchResults.forEach((r) => { if (r) results.push(r); });
    }
    return results;
  }

  async search(query: string): Promise<AssetSearchResult[]> {
    const cacheKey = `search:stock:${query.toLowerCase()}`;
    try {
      const cached = await redis.get<AssetSearchResult[]>(cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) return cached;
    } catch {}

    const data = await finnhubFetch("/search", { q: query });
    if (!data?.result) return [];

    // Minimal filter: drop crypto-style symbols only. Sort US primaries first
    // (no dot in symbol), then by length (shorter tickers first), then the rest.
    const results = (data.result as any[])
      .filter((r: any) => r.symbol && !r.symbol.includes(":"))
      .map((r: any) => ({
        symbol: r.symbol as string,
        name: r.description as string,
        category: "STOCK" as const,
        exchange: r.displaySymbol as string,
        _isPrimary: !r.symbol.includes("."),
      }))
      .sort((a, b) => {
        if (a._isPrimary !== b._isPrimary) return Number(b._isPrimary) - Number(a._isPrimary);
        return a.symbol.length - b.symbol.length;
      })
      .slice(0, 15)
      .map(({ _isPrimary, ...rest }) => rest);

    try {
      await redis.set(cacheKey, results, { ex: 60 * 10 }); // 10 min TTL to avoid stale results
    } catch {}

    return results;
  }

  async getHistorical(symbol: string, range: string): Promise<OHLCV[]> {
    const now = Math.floor(Date.now() / 1000);
    const rangeMap: Record<string, number> = {
      "1D": 86400,
      "1W": 604800,
      "1M": 2592000,
      "3M": 7776000,
      "1Y": 31536000,
      "ALL": 157680000,
    };
    const from = now - (rangeMap[range] || rangeMap["1M"]);
    const resolution = range === "1D" ? "5" : range === "1W" ? "15" : "D";

    const data = await finnhubFetch("/stock/candle", {
      symbol: symbol.toUpperCase(),
      resolution,
      from: from.toString(),
      to: now.toString(),
    });

    if (data && data.s === "ok" && data.t?.length > 0) {
      return data.t.map((t: number, i: number) => ({
        time: t,
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: data.v[i],
      }));
    }

    // Fallback: Yahoo v8 chart (Finnhub free tier often blocks /stock/candle).
    try {
      const yRangeMap: Record<string, { range: string; interval: string }> = {
        "1D": { range: "1d", interval: "5m" },
        "1W": { range: "5d", interval: "30m" },
        "1M": { range: "1mo", interval: "1d" },
        "3M": { range: "3mo", interval: "1d" },
        "1Y": { range: "1y", interval: "1d" },
        "ALL": { range: "max", interval: "1wk" },
      };
      const cfg = yRangeMap[range] || yRangeMap["1M"];
      const res = await fetch(
        `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol.toUpperCase())}?interval=${cfg.interval}&range=${cfg.range}`,
        { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 300 } }
      );
      if (!res.ok) return [];
      const json = await res.json();
      const r = json?.chart?.result?.[0];
      const timestamps: number[] = r?.timestamp || [];
      const q = r?.indicators?.quote?.[0];
      if (!q || timestamps.length === 0) return [];
      return timestamps
        .map((t, i) => ({
          time: t,
          open: q.open?.[i] ?? 0,
          high: q.high?.[i] ?? 0,
          low: q.low?.[i] ?? 0,
          close: q.close?.[i] ?? 0,
          volume: q.volume?.[i] ?? 0,
        }))
        .filter((c) => c.close > 0);
    } catch {
      return [];
    }
  }
}
