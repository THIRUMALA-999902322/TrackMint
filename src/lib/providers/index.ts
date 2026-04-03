import { StocksProvider } from "./stocks";
import { CryptoProvider } from "./crypto";
import { MetalsProvider } from "./metals";
import { NewsService } from "./news";
import type { MarketDataProvider } from "./types";

export const stocksProvider = new StocksProvider();
export const cryptoProvider = new CryptoProvider();
export const metalsProvider = new MetalsProvider();
export const newsProvider = new NewsService();

export function getProviderForCategory(category: string): MarketDataProvider {
  switch (category) {
    case "STOCK":
      return stocksProvider;
    case "CRYPTO":
      return cryptoProvider;
    case "METAL":
      return metalsProvider;
    default:
      return stocksProvider;
  }
}

export type { PriceData, AssetSearchResult, OHLCV, NewsArticle, MarketDataProvider } from "./types";
