import { MarketDataProvider, PriceData, AssetSearchResult, OHLCV } from "./types";

const METALS: Record<string, { symbol: string; name: string; yahooSymbol: string; goldApiSymbol: string }> = {
  XAU: { symbol: "XAU", name: "Gold", yahooSymbol: "GC=F", goldApiSymbol: "XAU" },
  XAG: { symbol: "XAG", name: "Silver", yahooSymbol: "SI=F", goldApiSymbol: "XAG" },
  XPT: { symbol: "XPT", name: "Platinum", yahooSymbol: "PL=F", goldApiSymbol: "XPT" },
  XPD: { symbol: "XPD", name: "Palladium", yahooSymbol: "PA=F", goldApiSymbol: "XPD" },
};

// Per-ounce divisors — Yahoo returns per-contract prices for futures.
// Gold = 100 oz/contract (COMEX), Silver = 5000 oz (but quote is per-oz already on Yahoo),
// Platinum/Palladium = 50 oz/contract (but Yahoo shows per-oz).
// In practice Yahoo v8 meta.regularMarketPrice already reports per-ounce for these
// futures, so no division is needed. If a price looks unreasonable we leave it as-is
// and let the cache smooth things out.

const YAHOO_HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];

async function yahooMetalPrice(
  yahooSymbol: string
): Promise<{ price: number; changePercent: number; high: number; low: number } | null> {
  const path = `/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=5d`;
  for (const host of YAHOO_HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const meta = json?.chart?.result?.[0]?.meta;
      if (!meta?.regularMarketPrice) continue;

      const prev = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice;
      const changePercent = prev > 0 ? ((meta.regularMarketPrice - prev) / prev) * 100 : 0;

      return {
        price: meta.regularMarketPrice,
        changePercent,
        high: meta.regularMarketDayHigh || meta.regularMarketPrice,
        low: meta.regularMarketDayLow || meta.regularMarketPrice,
      };
    } catch {
      continue;
    }
  }
  return null;
}

function getGoldApiKey(): string {
  return process.env.GOLDAPI_KEY || "";
}

async function goldApiPrice(
  goldApiSymbol: string
): Promise<{ price: number; changePercent: number; high: number; low: number } | null> {
  const key = getGoldApiKey();
  if (!key) return null;

  try {
    const res = await fetch(`https://www.goldapi.io/api/${goldApiSymbol}/USD`, {
      headers: { "x-access-token": key, "Content-Type": "application/json" },
      next: { revalidate: 14400 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;

    return {
      price: data.price || 0,
      changePercent: data.chp || 0,
      high: data.high_price || data.price || 0,
      low: data.low_price || data.price || 0,
    };
  } catch {
    return null;
  }
}

export class MetalsProvider implements MarketDataProvider {
  async getPrice(symbol: string): Promise<PriceData | null> {
    const metal = METALS[symbol.toUpperCase()];
    if (!metal) return null;

    // Try Yahoo first (free, reliable), GoldAPI as fallback
    let result = await yahooMetalPrice(metal.yahooSymbol);
    if (!result) {
      result = await goldApiPrice(metal.goldApiSymbol);
    }
    if (!result) return null;

    return {
      symbol: metal.symbol,
      price: result.price,
      change24h: (result.price * result.changePercent) / 100,
      changePercent24h: result.changePercent,
      high24h: result.high,
      low24h: result.low,
      volume24h: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getPrices(symbols: string[]): Promise<PriceData[]> {
    const results = await Promise.all(symbols.map((s) => this.getPrice(s)));
    return results.filter(Boolean) as PriceData[];
  }

  search(query: string): Promise<AssetSearchResult[]> {
    const q = query.toLowerCase();
    const results = Object.values(METALS)
      .filter((m) => m.name.toLowerCase().includes(q) || m.symbol.toLowerCase().includes(q))
      .map((m) => ({
        symbol: m.symbol,
        name: m.name,
        category: "METAL" as const,
      }));
    return Promise.resolve(results);
  }

  async getHistorical(symbol: string, range: string): Promise<OHLCV[]> {
    const metal = METALS[symbol.toUpperCase()];
    if (!metal) return [];

    // Yahoo v8 chart endpoint works great for futures historical data
    const rangeMap: Record<string, { range: string; interval: string }> = {
      "1D": { range: "1d", interval: "5m" },
      "1W": { range: "5d", interval: "30m" },
      "1M": { range: "1mo", interval: "1d" },
      "3M": { range: "3mo", interval: "1d" },
      "1Y": { range: "1y", interval: "1d" },
      ALL: { range: "max", interval: "1wk" },
    };
    const cfg = rangeMap[range] || rangeMap["1M"];

    const path = `/v8/finance/chart/${encodeURIComponent(metal.yahooSymbol)}?interval=${cfg.interval}&range=${cfg.range}`;
    for (const host of YAHOO_HOSTS) {
      try {
        const res = await fetch(`${host}${path}`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
          },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) continue;
        const json = await res.json();
        const r = json?.chart?.result?.[0];
        const timestamps: number[] = r?.timestamp || [];
        const q = r?.indicators?.quote?.[0];
        if (!q || timestamps.length === 0) continue;

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
        continue;
      }
    }
    return [];
  }
}
