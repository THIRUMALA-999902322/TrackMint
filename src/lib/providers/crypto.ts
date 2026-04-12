import { MarketDataProvider, PriceData, AssetSearchResult, OHLCV } from "./types";
import { redis } from "@/lib/redis";

const BASE_URL = "https://api.coingecko.com/api/v3";

// Fetch and cache a crypto logo URL via CoinGecko search endpoint.
// Cached in Redis for 7 days (key: logo:<SYMBOL>).
export async function fetchCryptoLogo(symbol: string): Promise<string | undefined> {
  const key = `logo:${symbol.toUpperCase()}`;
  try {
    const cached = await redis.get<string>(key);
    if (cached) return cached;
  } catch {}
  try {
    const res = await fetch(`${BASE_URL}/search?query=${encodeURIComponent(symbol)}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    const coin = (data?.coins as any[])?.find((c) => c.symbol?.toUpperCase() === symbol.toUpperCase());
    const logo: string | undefined = coin?.large || coin?.thumb;
    if (logo) {
      try { await redis.set(key, logo, { ex: 60 * 60 * 24 * 7 }); } catch {}
    }
    return logo;
  } catch {
    return undefined;
  }
}

const SYMBOL_TO_ID: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", BNB: "binancecoin", SOL: "solana",
  XRP: "ripple", ADA: "cardano", DOGE: "dogecoin", DOT: "polkadot",
  MATIC: "matic-network", AVAX: "avalanche-2", LINK: "chainlink",
  UNI: "uniswap", ATOM: "cosmos", LTC: "litecoin", SHIB: "shiba-inu",
  TRX: "tron", NEAR: "near", APT: "aptos", ARB: "arbitrum",
  OP: "optimism", SUI: "sui", PEPE: "pepe", FIL: "filecoin",
};

function getHeaders(): HeadersInit {
  const key = process.env.COINGECKO_API_KEY;
  return key ? { "x-cg-demo-api-key": key, Accept: "application/json" } : { Accept: "application/json" };
}

/**
 * Resolve a symbol to its CoinGecko coin ID.
 * 1. Check the hardcoded map.
 * 2. Check Redis cache (key: cgid:<SYMBOL>, TTL 7 days).
 * 3. If a sourceId is provided (from DB/search), use that directly and cache it.
 * 4. Otherwise query the CoinGecko /search endpoint to find the correct ID.
 */
async function resolveId(symbol: string, sourceId?: string): Promise<string> {
  const upper = symbol.toUpperCase();

  // 1. Hardcoded map
  if (SYMBOL_TO_ID[upper]) return SYMBOL_TO_ID[upper];

  // 2. Redis cache
  const cacheKey = `cgid:${upper}`;
  try {
    const cached = await redis.get<string>(cacheKey);
    if (cached) return cached;
  } catch {}

  // 3. Provided sourceId (from DB)
  if (sourceId) {
    try { await redis.set(cacheKey, sourceId, { ex: 60 * 60 * 24 * 7 }); } catch {}
    return sourceId;
  }

  // 4. Look up via CoinGecko search
  try {
    const data = await cgFetch("/search", { query: symbol });
    if (data?.coins?.length) {
      // Prefer exact symbol match
      const exact = (data.coins as any[]).find(
        (c) => c.symbol?.toUpperCase() === upper
      );
      const coin = exact || data.coins[0];
      const id = coin.id as string;
      try { await redis.set(cacheKey, id, { ex: 60 * 60 * 24 * 7 }); } catch {}
      return id;
    }
  } catch {}

  // Fallback: lowercase symbol (may or may not work)
  return symbol.toLowerCase();
}

async function cgFetch(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const res = await fetch(url.toString(), { headers: getHeaders(), next: { revalidate: 300 } });
    if (res.status === 429) {
      console.error("CoinGecko rate limit hit");
      return null;
    }
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    console.error("CoinGecko fetch error:", e);
    return null;
  }
}

export class CryptoProvider implements MarketDataProvider {
  /**
   * Get price for a crypto symbol. Optionally pass a sourceId (CoinGecko coin id)
   * to avoid lookup overhead for non-hardcoded symbols.
   */
  async getPrice(symbol: string, sourceId?: string): Promise<PriceData | null> {
    const id = await resolveId(symbol, sourceId);
    const data = await cgFetch("/simple/price", {
      ids: id,
      vs_currencies: "usd",
      include_24hr_change: "true",
      include_24hr_vol: "true",
      include_market_cap: "true",
      include_last_updated_at: "true",
    });

    if (!data?.[id]) return null;
    const d = data[id];
    const logo = await fetchCryptoLogo(symbol).catch(() => undefined);

    return {
      symbol: symbol.toUpperCase(),
      price: d.usd,
      change24h: d.usd * (d.usd_24h_change || 0) / 100,
      changePercent24h: d.usd_24h_change || 0,
      high24h: 0,
      low24h: 0,
      volume24h: d.usd_24h_vol || 0,
      marketCap: d.usd_market_cap || 0,
      lastUpdated: d.last_updated_at
        ? new Date(d.last_updated_at * 1000).toISOString()
        : new Date().toISOString(),
      logo,
    };
  }

  async getPrices(symbols: string[]): Promise<PriceData[]> {
    // Resolve all IDs (may hit Redis cache for non-hardcoded)
    const resolvedIds = await Promise.all(symbols.map((s) => resolveId(s)));
    const ids = resolvedIds.join(",");
    const data = await cgFetch("/simple/price", {
      ids,
      vs_currencies: "usd",
      include_24hr_change: "true",
      include_24hr_vol: "true",
      include_market_cap: "true",
    });

    if (!data) return [];

    return symbols
      .map((symbol, idx) => {
        const id = resolvedIds[idx];
        const d = data[id];
        if (!d) return null;
        return {
          symbol: symbol.toUpperCase(),
          price: d.usd,
          change24h: d.usd * (d.usd_24h_change || 0) / 100,
          changePercent24h: d.usd_24h_change || 0,
          high24h: 0,
          low24h: 0,
          volume24h: d.usd_24h_vol || 0,
          marketCap: d.usd_market_cap || 0,
          lastUpdated: new Date().toISOString(),
        };
      })
      .filter(Boolean) as PriceData[];
  }

  async search(query: string): Promise<AssetSearchResult[]> {
    const data = await cgFetch("/search", { query });
    if (!data?.coins) return [];

    return data.coins.slice(0, 12).map((c: any) => ({
      symbol: c.symbol?.toUpperCase() || c.id,
      name: c.name,
      category: "CRYPTO" as const,
      logoUrl: c.thumb,
      logo: c.large || c.thumb,
      sourceId: c.id, // CoinGecko coin ID (e.g. "andy-the-andy-token")
    }));
  }

  async getHistorical(symbol: string, range: string, sourceId?: string): Promise<OHLCV[]> {
    const id = await resolveId(symbol, sourceId);
    const daysMap: Record<string, string> = {
      "1D": "1", "1W": "7", "1M": "30", "3M": "90", "1Y": "365", "ALL": "max",
    };
    const days = daysMap[range] || "30";

    const data = await cgFetch(`/coins/${id}/market_chart`, {
      vs_currency: "usd",
      days,
    });

    if (!data?.prices) return [];

    return data.prices.map(([time, price]: [number, number]) => ({
      time: Math.floor(time / 1000),
      open: price,
      high: price,
      low: price,
      close: price,
      volume: 0,
    }));
  }
}
