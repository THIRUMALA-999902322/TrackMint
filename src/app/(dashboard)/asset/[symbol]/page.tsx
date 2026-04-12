"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatPercentage, formatNumber, formatRelativeTime, getChangeColor, cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  ArrowLeft, ExternalLink, TrendingUp, TrendingDown, Activity, DollarSign,
  BarChart3, Eye, Briefcase, Bell, Globe, Shield, ChevronDown, ChevronUp,
  Coins, Gem, Info,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { AssetLogo } from "@/components/asset-logo";

const RANGES = ["1D", "1W", "1M", "3M", "1Y", "ALL"];

function StatBox({ label, value, icon: Icon, color }: { label: string; value: string; icon?: any; color?: string }) {
  return (
    <div className="p-3 rounded-lg bg-card/50 border">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className={cn("h-3.5 w-3.5", color || "text-muted-foreground")} />}
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function SentimentBadge({ sentiment }: { sentiment: { label: string; explanation: string } }) {
  const color = sentiment.label === "Bullish" ? "bg-green-500/10 text-green-500 border-green-500/20"
    : sentiment.label === "Bearish" ? "bg-red-500/10 text-red-500 border-red-500/20"
    : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";

  return (
    <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium", color)}>
      <Shield className="h-3.5 w-3.5" />
      {sentiment.label}
      <span className="text-xs opacity-70 hidden sm:inline">— {sentiment.explanation}</span>
    </div>
  );
}

export default function AssetDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const router = useRouter();
  const [chartRange, setChartRange] = useState("1M");
  const [showDescription, setShowDescription] = useState(false);

  const { data: priceData, isLoading: priceLoading } = useQuery({
    queryKey: ["asset-price", symbol],
    queryFn: async () => {
      const res = await fetch(`/api/assets/${symbol}/price`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: detailsData } = useQuery({
    queryKey: ["asset-details", symbol],
    queryFn: async () => {
      const res = await fetch(`/api/assets/${symbol}/details`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 30 * 60 * 1000,
  });

  const { data: newsData } = useQuery({
    queryKey: ["asset-news", symbol],
    queryFn: async () => {
      const res = await fetch(`/api/assets/${symbol}/news`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["asset-chart", symbol, chartRange, priceData?.data?.category],
    queryFn: async () => {
      const cat = priceData?.data?.category || "";
      const res = await fetch(`/api/assets/${symbol}?range=${chartRange}${cat ? `&category=${cat}` : ""}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!priceData,
  });

  const price = priceData?.data;
  const details = detailsData?.data;
  const news = newsData?.data || [];
  const stats = details?.stats || {};
  const sentiment = details?.sentiment;
  const description = details?.description || stats?.description;

  const chart = (chartData?.data?.historical || []).map((p: any) => ({
    time: new Date(p.time * 1000).toLocaleDateString("en-US", {
      month: "short", day: "numeric",
      ...(chartRange === "1D" ? { hour: "numeric", minute: "2-digit" } : {}),
    }),
    price: p.close || p.open,
  }));
  const isPositive = price?.changePercent24h >= 0;
  const chartUp = chart.length >= 2 ? chart[chart.length - 1]?.price >= chart[0]?.price : isPositive;

  const formatYAxis = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
    return `$${val.toFixed(val < 10 ? 2 : 0)}`;
  };

  const catLabel = price?.category === "STOCK" ? "Stock" : price?.category === "CRYPTO" ? "Crypto" : "Metal";
  const CatIcon = price?.category === "CRYPTO" ? Coins : price?.category === "METAL" ? Gem : TrendingUp;

  return (
    <div className="space-y-6">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      {priceLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : price ? (
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <AssetLogo symbol={symbol} category={price.category || "STOCK"} logo={price.logo || stats.logo} size={64} />
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold">{symbol}</h1>
                <Badge className={cn("text-xs border",
                  price.category === "STOCK" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                  price.category === "CRYPTO" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                  "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                )}>
                  <CatIcon className="h-3 w-3 mr-1" />{catLabel}
                </Badge>
              </div>
              <p className="text-muted-foreground">{stats.companyName || price.name || symbol}</p>
              {stats.sector && <p className="text-xs text-muted-foreground">{stats.sector}{stats.exchange ? ` · ${stats.exchange}` : ""}</p>}
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-3xl font-bold">{formatCurrency(price.price)}</p>
            <div className={cn("flex items-center gap-1 text-lg font-semibold", getChangeColor(price.changePercent24h))}>
              {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              {formatCurrency(Math.abs(price.change24h))} ({formatPercentage(price.changePercent24h)})
            </div>
          </div>
        </div>
      ) : (
        <h1 className="text-2xl font-bold">{symbol} — Price unavailable</h1>
      )}

      {/* Sentiment + Actions */}
      {price && (
        <div className="flex flex-wrap items-center gap-3">
          {sentiment && <SentimentBadge sentiment={sentiment} />}
          <div className="flex gap-2 ml-auto">
            <Link href="/watchlist"><Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-2" /> Watchlist</Button></Link>
            <Link href="/portfolio"><Button variant="outline" size="sm"><Briefcase className="h-4 w-4 mr-2" /> Hold</Button></Link>
            <Link href="/alerts"><Button variant="outline" size="sm"><Bell className="h-4 w-4 mr-2" /> Alert</Button></Link>
          </div>
        </div>
      )}

      {/* Chart */}
      <Card glass>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Price Chart</CardTitle>
          <Tabs defaultValue="1M" value={chartRange} onValueChange={setChartRange}>
            <TabsList className="h-8">
              {RANGES.map((r) => (
                <TabsTrigger key={r} value={r} className="text-xs px-2 py-1">{r}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {chartLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-center">
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading chart...</p>
              </div>
            </div>
          ) : chart.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No chart data for this time range</p>
                <p className="text-xs text-muted-foreground mt-1">Try a different period</p>
              </div>
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart}>
                  <defs>
                    <linearGradient id="assetChartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartUp ? "#00d68f" : "#ff6b6b"} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={chartUp ? "#00d68f" : "#ff6b6b"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#888" }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(chart.length / 6))} />
                  <YAxis tick={{ fontSize: 11, fill: "#888" }} tickLine={false} axisLine={false} tickFormatter={formatYAxis} domain={["dataMin", "dataMax"]} width={60} />
                  <Tooltip content={({ payload }) => {
                    if (!payload?.length) return null;
                    return (
                      <div className="bg-card/90 backdrop-blur-md border rounded-lg px-3 py-2 text-sm shadow-lg">
                        <p className="text-muted-foreground">{payload[0].payload.time}</p>
                        <p className="font-bold">{formatCurrency(payload[0].value as number)}</p>
                      </div>
                    );
                  }} />
                  <Area type="monotone" dataKey="price" stroke={chartUp ? "#00d68f" : "#ff6b6b"} fill="url(#assetChartGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Statistics */}
      {price && (
        <Card glass>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Key Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {stats.marketCap > 0 && <StatBox label="Market Cap" value={formatNumber(stats.marketCap)} icon={DollarSign} color="text-primary" />}
              {stats.peRatio != null && <StatBox label="P/E Ratio" value={stats.peRatio.toFixed(2)} icon={Activity} color="text-blue-400" />}
              {stats.eps != null && <StatBox label="EPS" value={`$${stats.eps.toFixed(2)}`} icon={TrendingUp} color="text-emerald-400" />}
              {stats.dividendYield != null && stats.dividendYield > 0 && <StatBox label="Div Yield" value={`${stats.dividendYield.toFixed(2)}%`} icon={DollarSign} color="text-amber-400" />}
              {stats.fiftyTwoWeekHigh > 0 && <StatBox label="52W High" value={formatCurrency(stats.fiftyTwoWeekHigh)} icon={TrendingUp} color="text-green-400" />}
              {stats.fiftyTwoWeekLow > 0 && <StatBox label="52W Low" value={formatCurrency(stats.fiftyTwoWeekLow)} icon={TrendingDown} color="text-red-400" />}
              {(stats.volume24h > 0 || stats.regularMarketVolume > 0) && <StatBox label="Volume" value={formatNumber(stats.volume24h || stats.regularMarketVolume)} icon={BarChart3} color="text-blue-400" />}
              {stats.avgVolume > 0 && <StatBox label="Avg Volume" value={formatNumber(stats.avgVolume)} icon={BarChart3} color="text-purple-400" />}
              {/* Crypto-specific */}
              {stats.circulatingSupply > 0 && <StatBox label="Circulating" value={formatNumber(stats.circulatingSupply)} icon={Coins} color="text-orange-400" />}
              {stats.totalSupply > 0 && <StatBox label="Total Supply" value={formatNumber(stats.totalSupply)} icon={Coins} color="text-yellow-400" />}
              {stats.ath > 0 && <StatBox label="All-Time High" value={formatCurrency(stats.ath)} icon={TrendingUp} color="text-green-400" />}
              {stats.priceChangePercent7d != null && <StatBox label="7d Change" value={`${stats.priceChangePercent7d.toFixed(2)}%`} icon={Activity} color={stats.priceChangePercent7d >= 0 ? "text-green-400" : "text-red-400"} />}
              {stats.priceChangePercent30d != null && <StatBox label="30d Change" value={`${stats.priceChangePercent30d.toFixed(2)}%`} icon={Activity} color={stats.priceChangePercent30d >= 0 ? "text-green-400" : "text-red-400"} />}
              {/* Metal-specific */}
              {stats.dayHigh > 0 && <StatBox label="Day High" value={formatCurrency(stats.dayHigh)} icon={TrendingUp} color="text-green-400" />}
              {stats.dayLow > 0 && <StatBox label="Day Low" value={formatCurrency(stats.dayLow)} icon={TrendingDown} color="text-red-400" />}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Description / About */}
      {description && (
        <Card glass>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">About {stats.companyName || symbol}</span>
              {stats.website && (
                <a href={stats.website} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline">
                  <Globe className="h-3 w-3" /> Website
                </a>
              )}
            </div>
            <p className={cn("text-sm text-muted-foreground leading-relaxed", !showDescription && "line-clamp-3")}>
              {description}
            </p>
            {description.length > 200 && (
              <button onClick={() => setShowDescription(!showDescription)} className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline">
                {showDescription ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Read more</>}
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Latest News */}
      <Card glass>
        <CardHeader className="pb-2"><CardTitle className="text-base">Latest News</CardTitle></CardHeader>
        <CardContent>
          {news.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No news available for {symbol}</p>
          ) : (
            <div className="space-y-1">
              {news.map((item: any, i: number) => (
                <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="block group">
                  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {item.imageUrl && <img src={item.imageUrl} alt="" className="h-16 w-24 rounded object-cover shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">{item.headline}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{item.source}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{formatRelativeTime(item.publishedAt)}</span>
                        {item.sentiment && (
                          <Badge variant={item.sentiment === "POSITIVE" ? "profit" : item.sentiment === "NEGATIVE" ? "loss" : "secondary"} className="text-[10px]">{item.sentiment}</Badge>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="h-3 w-3 text-muted-foreground mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">Data for informational purposes only. Not financial advice.</p>
    </div>
  );
}
