import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/db";

const CACHE_PREFIX = "details:";
const CACHE_TTL = 1800; // 30 min

// --- Stock details via Yahoo Finance + Finnhub profile ---

async function fetchStockDetails(symbol: string) {
  const upper = symbol.toUpperCase();
  const stats: Record<string, any> = {};

  // Yahoo v8 chart for stats (52wk, volume, etc.)
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(upper)}?interval=1d&range=1y`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 300 } }
    );
    if (res.ok) {
      const json = await res.json();
      const meta = json?.chart?.result?.[0]?.meta;
      if (meta) {
        stats.fiftyTwoWeekHigh = meta.fiftyTwoWeekHigh ?? null;
        stats.fiftyTwoWeekLow = meta.fiftyTwoWeekLow ?? null;
        stats.regularMarketVolume = meta.regularMarketVolume ?? null;
      }
      // Calculate 50-day MA from closing prices
      const closes: number[] = (json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []).filter(
        (v: any) => v != null && v > 0
      );
      if (closes.length >= 50) {
        const last50 = closes.slice(-50);
        stats.ma50 = last50.reduce((a: number, b: number) => a + b, 0) / 50;
      }
      stats.currentPrice = meta?.regularMarketPrice ?? null;
    }
  } catch {}

  // Finnhub profile2 for company info
  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (finnhubKey) {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/stock/profile2?symbol=${upper}&token=${finnhubKey}`,
        { next: { revalidate: 86400 } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error) {
          stats.companyName = data.name || null;
          stats.sector = data.finnhubIndustry || null;
          stats.industry = data.finnhubIndustry || null;
          stats.website = data.weburl || null;
          stats.logo = data.logo || null;
          stats.exchange = data.exchange || null;
          stats.ipo = data.ipo || null;
          stats.marketCap = data.marketCapitalization
            ? data.marketCapitalization * 1e6
            : null; // Finnhub gives in millions
          stats.country = data.country || null;
        }
      }
    } catch {}

    // Finnhub basic financials for P/E, EPS, dividend yield, avg volume
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/stock/metric?symbol=${upper}&metric=all&token=${finnhubKey}`,
        { next: { revalidate: 86400 } }
      );
      if (res.ok) {
        const data = await res.json();
        const m = data?.metric;
        if (m) {
          stats.peRatio = m.peBasicExclExtraTTM ?? m.peExclExtraTTM ?? null;
          stats.eps = m.epsBasicExclExtraItemsTTM ?? m.epsExclExtraItemsTTM ?? null;
          stats.dividendYield = m.dividendYieldIndicatedAnnual ?? null;
          stats.avgVolume = m["10DayAverageTradingVolume"]
            ? m["10DayAverageTradingVolume"] * 1e6
            : null;
          // Prefer Finnhub 52-week if Yahoo didn't return
          if (!stats.fiftyTwoWeekHigh) stats.fiftyTwoWeekHigh = m["52WeekHigh"] ?? null;
          if (!stats.fiftyTwoWeekLow) stats.fiftyTwoWeekLow = m["52WeekLow"] ?? null;
        }
      }
    } catch {}
  }

  // Sentiment from MA50
  let sentiment: { label: string; explanation: string } | null = null;
  if (stats.ma50 && stats.currentPrice) {
    const pctDiff = ((stats.currentPrice - stats.ma50) / stats.ma50) * 100;
    if (pctDiff > 2) {
      sentiment = {
        label: "Bullish",
        explanation: `Price is ${pctDiff.toFixed(1)}% above 50-day moving average`,
      };
    } else if (pctDiff < -2) {
      sentiment = {
        label: "Bearish",
        explanation: `Price is ${Math.abs(pctDiff).toFixed(1)}% below 50-day moving average`,
      };
    } else {
      sentiment = {
        label: "Neutral",
        explanation: `Price is within 2% of 50-day moving average`,
      };
    }
  }

  return { category: "STOCK", stats, sentiment };
}

// --- Crypto details via CoinGecko ---

const SYMBOL_TO_ID: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", BNB: "binancecoin", SOL: "solana",
  XRP: "ripple", ADA: "cardano", DOGE: "dogecoin", DOT: "polkadot",
  MATIC: "matic-network", AVAX: "avalanche-2", LINK: "chainlink",
  UNI: "uniswap", ATOM: "cosmos", LTC: "litecoin", SHIB: "shiba-inu",
  TRX: "tron", NEAR: "near", APT: "aptos", ARB: "arbitrum",
  OP: "optimism", SUI: "sui", PEPE: "pepe", FIL: "filecoin",
};

function symbolToId(symbol: string): string {
  return SYMBOL_TO_ID[symbol.toUpperCase()] || symbol.toLowerCase();
}

async function fetchCryptoDetails(symbol: string) {
  const id = symbolToId(symbol);
  const stats: Record<string, any> = {};
  let sentiment: { label: string; explanation: string } | null = null;
  let description: string | null = null;

  const cgKey = process.env.COINGECKO_API_KEY;
  const headers: HeadersInit = cgKey
    ? { "x-cg-demo-api-key": cgKey, Accept: "application/json" }
    : { Accept: "application/json" };

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false`,
      { headers, next: { revalidate: 1800 } }
    );
    if (res.ok) {
      const data = await res.json();
      const md = data?.market_data;
      if (md) {
        stats.marketCap = md.market_cap?.usd ?? null;
        stats.volume24h = md.total_volume?.usd ?? null;
        stats.circulatingSupply = md.circulating_supply ?? null;
        stats.totalSupply = md.total_supply ?? null;
        stats.ath = md.ath?.usd ?? null;
        stats.athDate = md.ath_date?.usd ?? null;
        stats.atl = md.atl?.usd ?? null;
        stats.atlDate = md.atl_date?.usd ?? null;
        stats.high24h = md.high_24h?.usd ?? null;
        stats.low24h = md.low_24h?.usd ?? null;
        stats.priceChangePercent7d = md.price_change_percentage_7d ?? null;
        stats.priceChangePercent30d = md.price_change_percentage_30d ?? null;
        stats.currentPrice = md.current_price?.usd ?? null;
      }
      description = data?.description?.en || null;
      stats.logo = data?.image?.large || data?.image?.small || null;
      stats.companyName = data?.name || null;
      stats.website = data?.links?.homepage?.[0] || null;
    }
  } catch {}

  // Fear & Greed from alternative.me
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1", {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      const fng = data?.data?.[0];
      if (fng) {
        const val = parseInt(fng.value);
        let label = "Neutral";
        if (val >= 60) label = "Bullish";
        else if (val <= 40) label = "Bearish";
        sentiment = {
          label,
          explanation: `Crypto Fear & Greed Index: ${fng.value} (${fng.value_classification})`,
        };
      }
    }
  } catch {}

  return { category: "CRYPTO", stats, sentiment, description };
}

// --- Metal details ---

const METAL_DESCRIPTIONS: Record<string, string> = {
  XAU: "Gold is a precious metal that has been used as a store of value and medium of exchange for thousands of years. It is considered a safe-haven asset during periods of economic uncertainty and inflation. Gold is traded globally on commodity exchanges, with prices quoted per troy ounce.",
  XAG: "Silver is a precious metal with both industrial and monetary applications. It is widely used in electronics, solar panels, and jewelry. Silver tends to be more volatile than gold but often follows similar macroeconomic trends.",
  XPT: "Platinum is a rare precious metal with significant industrial demand, particularly in automotive catalytic converters. It is one of the rarest elements in the Earth's crust and is traded on major commodity exchanges.",
  XPD: "Palladium is a precious metal primarily used in catalytic converters for gasoline-powered vehicles. Its price is heavily influenced by automotive industry demand and mining supply from Russia and South Africa.",
};

async function fetchMetalDetails(symbol: string) {
  const upper = symbol.toUpperCase();
  const stats: Record<string, any> = {};
  let sentiment: { label: string; explanation: string } | null = null;

  // Yahoo for price range and 52-week data
  const yahooSymbolMap: Record<string, string> = {
    XAU: "GC=F", XAG: "SI=F", XPT: "PL=F", XPD: "PA=F",
  };
  const yahooSymbol = yahooSymbolMap[upper];
  if (yahooSymbol) {
    try {
      const res = await fetch(
        `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1y`,
        { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 600 } }
      );
      if (res.ok) {
        const json = await res.json();
        const meta = json?.chart?.result?.[0]?.meta;
        if (meta) {
          stats.fiftyTwoWeekHigh = meta.fiftyTwoWeekHigh ?? null;
          stats.fiftyTwoWeekLow = meta.fiftyTwoWeekLow ?? null;
          stats.dayHigh = meta.regularMarketDayHigh ?? null;
          stats.dayLow = meta.regularMarketDayLow ?? null;
          stats.currentPrice = meta.regularMarketPrice ?? null;
        }
        // Calculate 50-day MA
        const closes: number[] = (json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []).filter(
          (v: any) => v != null && v > 0
        );
        if (closes.length >= 50) {
          const last50 = closes.slice(-50);
          stats.ma50 = last50.reduce((a: number, b: number) => a + b, 0) / 50;
        }
      }
    } catch {}
  }

  if (stats.ma50 && stats.currentPrice) {
    const pctDiff = ((stats.currentPrice - stats.ma50) / stats.ma50) * 100;
    if (pctDiff > 2) {
      sentiment = { label: "Bullish", explanation: `Price is ${pctDiff.toFixed(1)}% above 50-day moving average` };
    } else if (pctDiff < -2) {
      sentiment = { label: "Bearish", explanation: `Price is ${Math.abs(pctDiff).toFixed(1)}% below 50-day moving average` };
    } else {
      sentiment = { label: "Neutral", explanation: `Price is within 2% of 50-day moving average` };
    }
  }

  return {
    category: "METAL",
    stats,
    sentiment,
    description: METAL_DESCRIPTIONS[upper] || null,
  };
}

// --- Route handler ---

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const symbol = params.id.toUpperCase();

  try {
    // Check cache
    const cacheKey = `${CACHE_PREFIX}${symbol}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
        return NextResponse.json({ data: parsed });
      }
    } catch {}

    // Determine category from DB
    const dbAsset = await prisma.asset.findFirst({ where: { symbol } }).catch(() => null);
    const category = dbAsset?.category || "STOCK";

    let result: any;
    if (category === "CRYPTO") {
      result = await fetchCryptoDetails(symbol);
    } else if (category === "METAL") {
      result = await fetchMetalDetails(symbol);
    } else {
      result = await fetchStockDetails(symbol);
    }

    result.symbol = symbol;

    // Cache result
    try {
      await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });
    } catch {}

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Asset details error:", error);
    return NextResponse.json(
      { data: null, error: "Failed to fetch asset details" },
      { status: 500 }
    );
  }
}
