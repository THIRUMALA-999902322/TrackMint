import { MarketDataProvider, PriceData, AssetSearchResult, OHLCV } from "./types";

const METALS: Record<string, { symbol: string; name: string; apiSymbol: string }> = {
  XAU: { symbol: "XAU", name: "Gold", apiSymbol: "XAU" },
  XAG: { symbol: "XAG", name: "Silver", apiSymbol: "XAG" },
  XPT: { symbol: "XPT", name: "Platinum", apiSymbol: "XPT" },
  XPD: { symbol: "XPD", name: "Palladium", apiSymbol: "XPD" },
};

function getKey(): string {
  return process.env.GOLDAPI_KEY || "";
}

export class MetalsProvider implements MarketDataProvider {
  async getPrice(symbol: string): Promise<PriceData | null> {
    const metal = METALS[symbol.toUpperCase()];
    if (!metal) return null;

    try {
      const res = await fetch(`https://www.goldapi.io/api/${metal.apiSymbol}/USD`, {
        headers: {
          "x-access-token": getKey(),
          "Content-Type": "application/json",
        },
        next: { revalidate: 14400 }, // Cache 4 hours (only 100 calls/month)
      });

      if (!res.ok) {
        console.error(`GoldAPI error: ${res.status}`);
        return null;
      }

      const data = await res.json();

      return {
        symbol: metal.symbol,
        price: data.price || 0,
        change24h: data.ch || 0,
        changePercent24h: data.chp || 0,
        high24h: data.high_price || data.price || 0,
        low24h: data.low_price || data.price || 0,
        volume24h: 0,
        lastUpdated: data.timestamp
          ? new Date(data.timestamp * 1000).toISOString()
          : new Date().toISOString(),
      };
    } catch (e) {
      console.error("GoldAPI fetch error:", e);
      return null;
    }
  }

  async getPrices(symbols: string[]): Promise<PriceData[]> {
    const results: PriceData[] = [];
    for (const symbol of symbols) {
      const price = await this.getPrice(symbol);
      if (price) results.push(price);
    }
    return results;
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

  async getHistorical(_symbol: string, _range: string): Promise<OHLCV[]> {
    // GoldAPI free tier doesn't support historical data
    // Return empty - the UI will handle this gracefully
    return [];
  }
}
