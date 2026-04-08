export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap?: number;
  lastUpdated: string;
  logo?: string;
}

export interface AssetSearchResult {
  symbol: string;
  name: string;
  category: "STOCK" | "CRYPTO" | "METAL";
  exchange?: string;
  logoUrl?: string;
  logo?: string;
}

export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface NewsArticle {
  headline: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment?: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  summary?: string;
  imageUrl?: string;
}

export interface MarketDataProvider {
  getPrice(symbol: string): Promise<PriceData | null>;
  getPrices(symbols: string[]): Promise<PriceData[]>;
  search(query: string): Promise<AssetSearchResult[]>;
  getHistorical(symbol: string, range: "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL"): Promise<OHLCV[]>;
}

export interface NewsProvider {
  getNews(symbol: string, category?: string): Promise<NewsArticle[]>;
  getMarketNews(): Promise<NewsArticle[]>;
}
