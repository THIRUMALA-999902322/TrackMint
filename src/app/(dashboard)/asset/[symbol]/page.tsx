"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatPercentage, formatNumber, formatRelativeTime, getChangeColor, cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ExternalLink, TrendingUp, TrendingDown, Activity, DollarSign, BarChart3 } from "lucide-react";
import { useState } from "react";

export default function AssetDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
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

  const { data: chartData } = useQuery({
    queryKey: ["asset-chart", symbol, chartRange],
    queryFn: async () => {
      const res = await fetch(`/api/assets/${symbol}?range=${chartRange}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const price = priceData?.data;
  const news = newsData?.data || [];
  const chart = (chartData?.data?.historical || []).map((p: any) => ({
    time: new Date(p.time * 1000).toLocaleDateString(),
    price: p.close || p.open,
  }));
  const isPositive = price?.changePercent24h >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        {priceLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : price ? (
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold">{symbol}</h1>
                <Badge variant="secondary">{price.category || "Asset"}</Badge>
              </div>
              <p className="text-muted-foreground">{price.name}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{formatCurrency(price.price)}</p>
              <p className={cn("text-lg font-semibold", getChangeColor(price.changePercent24h))}>
                {formatCurrency(Math.abs(price.change24h))} ({formatPercentage(price.changePercent24h)})
              </p>
            </div>
          </div>
        ) : (
          <h1 className="text-2xl font-bold">{symbol}</h1>
        )}
      </div>

      {/* Stats */}
      {price && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card glass><CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Activity className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">24h High</span></div>
            <p className="text-sm font-semibold">{formatCurrency(price.high24h)}</p>
          </CardContent></Card>
          <Card glass><CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Activity className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">24h Low</span></div>
            <p className="text-sm font-semibold">{formatCurrency(price.low24h)}</p>
          </CardContent></Card>
          <Card glass><CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><BarChart3 className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Volume</span></div>
            <p className="text-sm font-semibold">{formatNumber(price.volume24h)}</p>
          </CardContent></Card>
          {price.marketCap && (
            <Card glass><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Market Cap</span></div>
              <p className="text-sm font-semibold">{formatNumber(price.marketCap)}</p>
            </CardContent></Card>
          )}
        </div>
      )}

      {/* Chart */}
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
          {chart.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
              No chart data available
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart}>
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isPositive ? "#00d68f" : "#ff6b6b"} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={isPositive ? "#00d68f" : "#ff6b6b"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" hide />
                  <YAxis hide domain={["dataMin", "dataMax"]} />
                  <Tooltip content={({ payload }) => {
                    if (!payload?.length) return null;
                    return (
                      <div className="bg-card border rounded-lg px-3 py-2 text-sm shadow-lg">
                        <p className="text-muted-foreground">{payload[0].payload.time}</p>
                        <p className="font-medium">{formatCurrency(payload[0].value as number)}</p>
                      </div>
                    );
                  }} />
                  <Area type="monotone" dataKey="price" stroke={isPositive ? "#00d68f" : "#ff6b6b"} fill="url(#chartGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* News */}
      <Card glass>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Latest News</CardTitle>
        </CardHeader>
        <CardContent>
          {news.length === 0 ? (
            <p className="text-sm text-muted-foreground">No news available for {symbol}</p>
          ) : (
            <div className="space-y-3">
              {news.map((item: any, i: number) => (
                <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="block group">
                  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt="" className="h-16 w-24 rounded object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2 group-hover:text-primary">{item.headline}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{item.source}</span>
                        <span className="text-xs text-muted-foreground">{formatRelativeTime(item.publishedAt)}</span>
                        {item.sentiment && (
                          <Badge variant={item.sentiment === "POSITIVE" ? "profit" : item.sentiment === "NEGATIVE" ? "loss" : "neutral"} className="text-[10px]">
                            {item.sentiment}
                          </Badge>
                        )}
                      </div>
                      {item.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>}
                    </div>
                    <ExternalLink className="h-3 w-3 text-muted-foreground mt-1 shrink-0" />
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
