import { MarketDataProvider, PriceData, AssetSearchResult, OHLCV } from "./types";

const BASE_URL = "https://api.coingecko.com/api/v3";

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

function symbolToId(symbol: string): string {
  return SYMBOL_TO_ID[symbol.toUpperCase()] || symbol.toLowerCase();
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
  async getPrice(symbol: string): Promise<PriceData | null> {
    const id = symbolToId(symbol);
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
    };
  }

  async getPrices(symbols: string[]): Promise<PriceData[]> {
    const ids = symbols.map(symbolToId).join(",");
    const data = await cgFetch("/simple/price", {
      ids,
      vs_currencies: "usd",
      include_24hr_change: "true",
      include_24hr_vol: "true",
      include_market_cap: "true",
    });

    if (!data) return [];

    return symbols
      .map((symbol) => {
        const id = symbolToId(symbol);
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

    return data.coins.slice(0, 10).map((c: any) => ({
      symbol: c.symbol?.toUpperCase() || c.id,
      name: c.name,
      category: "CRYPTO" as const,
      logoUrl: c.thumb,
    }));
  }

  async getHistorical(symbol: string, range: string): Promise<OHLCV[]> {
    const id = symbolToId(symbol);
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
