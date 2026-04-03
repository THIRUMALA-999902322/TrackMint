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
import { ArrowLeft, ExternalLink, TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Eye, Briefcase, Bell } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function AssetDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const router = useRouter();
  const [chartRange, setChartRange] = useState("1M");

  const { data: priceData, isLoading: priceLoading } = useQuery({
    queryKey: ["asset-price", symbol],
    queryFn: async () => {
      const res = await fetch(`/api/assets/${symbol}/price`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 60000,
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
  const news = newsData?.data || [];
  const chart = (chartData?.data?.historical || []).map((p: any) => ({
    time: new Date(p.time * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    price: p.close || p.open,
  }));
  const isPositive = price?.changePercent24h >= 0;

  const formatYAxis = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
    return `$${val.toFixed(val < 10 ? 2 : 0)}`;
  };

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {priceLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : price ? (
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold">{symbol}</h1>
              <Badge className={cn("text-xs",
                price.category === "STOCK" ? "bg-blue-500/20 text-blue-400" :
                price.category === "CRYPTO" ? "bg-orange-500/20 text-orange-400" :
                "bg-yellow-500/20 text-yellow-400"
              )}>{price.category || "Asset"}</Badge>
            </div>
            <p className="text-muted-foreground">{price.name || symbol}</p>
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

      {price && (
        <div className="flex flex-wrap gap-2">
          <Link href="/watchlist"><Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-2" /> Add to Watchlist</Button></Link>
          <Link href="/portfolio"><Button variant="outline" size="sm"><Briefcase className="h-4 w-4 mr-2" /> Add Holding</Button></Link>
          <Link href="/alerts"><Button variant="outline" size="sm"><Bell className="h-4 w-4 mr-2" /> Set Alert</Button></Link>
        </div>
      )}

      {price && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {price.high24h > 0 && (
            <Card glass><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><Activity className="h-4 w-4 text-emerald-400" /><span className="text-xs text-muted-foreground">24h High</span></div>
              <p className="text-sm font-semibold">{formatCurrency(price.high24h)}</p>
            </CardContent></Card>
          )}
          {price.low24h > 0 && (
            <Card glass><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><Activity className="h-4 w-4 text-red-400" /><span className="text-xs text-muted-foreground">24h Low</span></div>
              <p className="text-sm font-semibold">{formatCurrency(price.low24h)}</p>
            </CardContent></Card>
          )}
          {price.volume24h > 0 && (
            <Card glass><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><BarChart3 className="h-4 w-4 text-blue-400" /><span className="text-xs text-muted-foreground">Volume</span></div>
              <p className="text-sm font-semibold">{formatNumber(price.volume24h)}</p>
            </CardContent></Card>
          )}
          {price.marketCap > 0 && (
            <Card glass><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Market Cap</span></div>
              <p className="text-sm font-semibold">{formatNumber(price.marketCap)}</p>
            </CardContent></Card>
          )}
        </div>
      )}

      <Card glass>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Price Chart</CardTitle>
          <Tabs defaultValue="1M" value={chartRange} onValueChange={setChartRange}>
            <TabsList className="h-8">
              {["1D", "1W", "1M", "3M", "1Y"].map((r) => (
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
                <p className="text-sm text-muted-foreground">Chart data not available for this timeframe</p>
                <p className="text-xs text-muted-foreground mt-1">Try a different time range</p>
              </div>
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart}>
                  <defs>
                    <linearGradient id="assetChartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isPositive ? "#00d68f" : "#ff6b6b"} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={isPositive ? "#00d68f" : "#ff6b6b"} stopOpacity={0} />
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
                  <Area type="monotone" dataKey="price" stroke={isPositive ? "#00d68f" : "#ff6b6b"} fill="url(#assetChartGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {price && (
        <Card glass>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <div><span className="text-muted-foreground">Category: </span><span className="font-medium">{price.category === "STOCK" ? "Stock" : price.category === "CRYPTO" ? "Cryptocurrency" : "Precious Metal"}</span></div>
              <div><span className="text-muted-foreground">Last Updated: </span><span className="font-medium">{price.lastUpdated ? formatRelativeTime(price.lastUpdated) : "just now"}</span></div>
            </div>
          </CardContent>
        </Card>
      )}

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
                    {item.imageUrl && <img src={item.imageUrl} alt="" className="h-16 w-24 rounded object-cover shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">{item.headline}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{item.source}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{formatRelativeTime(item.publishedAt)}</span>
                        {item.sentiment && (
                          <Badge variant={item.sentiment === "POSITIVE" ? "profit" : item.sentiment === "NEGATIVE" ? "loss" : "neutral"} className="text-[10px]">{item.sentiment}</Badge>
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
