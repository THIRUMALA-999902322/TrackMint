import { MarketDataProvider, PriceData, AssetSearchResult, OHLCV } from "./types";

const BASE_URL = "https://finnhub.io/api/v1";

function getKey(): string {
  return process.env.FINNHUB_API_KEY || "";
}

async function finnhubFetch(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set("token", getKey());
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!res.ok) {
    console.error(`Finnhub error: ${res.status} for ${endpoint}`);
    return null;
  }
  return res.json();
}

export class StocksProvider implements MarketDataProvider {
  async getPrice(symbol: string): Promise<PriceData | null> {
    const data = await finnhubFetch("/quote", { symbol: symbol.toUpperCase() });
    if (!data || data.c === 0) return null;

    return {
      symbol: symbol.toUpperCase(),
      price: data.c,
      change24h: data.d || 0,
      changePercent24h: data.dp || 0,
      high24h: data.h || 0,
      low24h: data.l || 0,
      volume24h: 0,
      lastUpdated: new Date().toISOString(),
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
    const data = await finnhubFetch("/search", { q: query });
    if (!data?.result) return [];

    return data.result
      .filter((r: any) => r.type === "Common Stock" || r.type === "ETP")
      .slice(0, 10)
      .map((r: any) => ({
        symbol: r.symbol,
        name: r.description,
        category: "STOCK" as const,
        exchange: r.displaySymbol,
      }));
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

    if (!data || data.s !== "ok") return [];

    return data.t.map((t: number, i: number) => ({
      time: t,
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v[i],
    }));
  }
}
