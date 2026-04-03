import { NewsProvider as INewsProvider, NewsArticle } from "./types";

const POSITIVE_WORDS = ["surge", "rally", "gain", "soar", "rise", "jump", "bull", "boom", "record", "high", "profit", "growth", "upgrade", "beat", "outperform"];
const NEGATIVE_WORDS = ["crash", "drop", "fall", "plunge", "sink", "bear", "bust", "low", "loss", "decline", "downgrade", "miss", "underperform", "sell", "fear"];

function detectSentiment(headline: string): "POSITIVE" | "NEGATIVE" | "NEUTRAL" {
  const lower = headline.toLowerCase();
  const posCount = POSITIVE_WORDS.filter((w) => lower.includes(w)).length;
  const negCount = NEGATIVE_WORDS.filter((w) => lower.includes(w)).length;
  if (posCount > negCount) return "POSITIVE";
  if (negCount > posCount) return "NEGATIVE";
  return "NEUTRAL";
}

export class NewsService implements INewsProvider {
  async getNews(symbol: string, _category?: string): Promise<NewsArticle[]> {
    // Try Finnhub first
    const finnhubNews = await this.fetchFinnhubNews(symbol);
    if (finnhubNews.length > 0) return finnhubNews;

    // Fallback to MarketAux
    return this.fetchMarketAuxNews(symbol);
  }

  async getMarketNews(): Promise<NewsArticle[]> {
    try {
      const key = process.env.FINNHUB_API_KEY;
      if (!key) return [];

      const res = await fetch(
        `https://finnhub.io/api/v1/news?category=general&token=${key}`,
        { next: { revalidate: 1800 } }
      );
      if (!res.ok) return [];
      const data = await res.json();

      return (data || []).slice(0, 15).map((item: any) => ({
        headline: item.headline,
        url: item.url,
        source: item.source,
        publishedAt: new Date(item.datetime * 1000).toISOString(),
        sentiment: detectSentiment(item.headline),
        summary: item.summary,
        imageUrl: item.image,
      }));
    } catch (e) {
      console.error("Finnhub market news error:", e);
      return [];
    }
  }

  private async fetchFinnhubNews(symbol: string): Promise<NewsArticle[]> {
    try {
      const key = process.env.FINNHUB_API_KEY;
      if (!key) return [];

      const to = new Date().toISOString().split("T")[0];
      const from = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

      const res = await fetch(
        `https://finnhub.io/api/v1/company-news?symbol=${symbol.toUpperCase()}&from=${from}&to=${to}&token=${key}`,
        { next: { revalidate: 1800 } }
      );
      if (!res.ok) return [];
      const data = await res.json();

      return (data || []).slice(0, 10).map((item: any) => ({
        headline: item.headline,
        url: item.url,
        source: item.source,
        publishedAt: new Date(item.datetime * 1000).toISOString(),
        sentiment: detectSentiment(item.headline),
        summary: item.summary,
        imageUrl: item.image,
      }));
    } catch {
      return [];
    }
  }

  private async fetchMarketAuxNews(symbol: string): Promise<NewsArticle[]> {
    try {
      const key = process.env.MARKETAUX_API_KEY;
      if (!key) return [];

      const res = await fetch(
        `https://api.marketaux.com/v1/news/all?symbols=${symbol.toUpperCase()}&api_token=${key}&limit=3`,
        { next: { revalidate: 1800 } }
      );
      if (!res.ok) return [];
      const data = await res.json();

      return (data.data || []).map((item: any) => ({
        headline: item.title,
        url: item.url,
        source: item.source,
        publishedAt: item.published_at,
        sentiment: detectSentiment(item.title),
        summary: item.description,
        imageUrl: item.image_url,
      }));
    } catch {
      return [];
    }
  }
}
