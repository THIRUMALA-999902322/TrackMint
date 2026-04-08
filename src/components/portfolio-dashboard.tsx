"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatPercentage, getChangeColor, cn, getCategoryLabel } from "@/lib/utils";
import { AssetLogo } from "@/components/asset-logo";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface Holding {
  id: string;
  symbol: string;
  name: string;
  category: string;
  quantity: number;
  avg_buy_price: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  logo?: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  STOCK: "#3b82f6",
  CRYPTO: "#f97316",
  METAL: "#eab308",
};

export function PortfolioDashboard({ holdings }: { holdings: Holding[] }) {
  // Allocation by category
  const allocation = useMemo(() => {
    const byCat: Record<string, number> = {};
    for (const h of holdings) {
      byCat[h.category] = (byCat[h.category] || 0) + (h.currentValue || 0);
    }
    return Object.entries(byCat)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [holdings]);

  const totalValue = useMemo(
    () => holdings.reduce((s, h) => s + (h.currentValue || 0), 0),
    [holdings]
  );

  // Best & worst performers
  const { best, worst } = useMemo(() => {
    const loaded = holdings.filter((h) => h.currentPrice > 0);
    if (loaded.length === 0) return { best: null, worst: null };
    const sorted = [...loaded].sort((a, b) => b.unrealizedPLPercent - a.unrealizedPLPercent);
    return { best: sorted[0], worst: sorted[sorted.length - 1] };
  }, [holdings]);

  // Fetch historical data for each holding to build a portfolio performance line
  const historicals = useQueries({
    queries: holdings.map((h) => ({
      queryKey: ["hist", h.symbol, h.category, "1M"],
      queryFn: async () => {
        const res = await fetch(
          `/api/assets/${encodeURIComponent(h.symbol)}?range=1M&category=${h.category}`
        );
        if (!res.ok) return { symbol: h.symbol, quantity: h.quantity, points: [] as any[] };
        const json = await res.json();
        const hist = (json?.data?.historical || []) as Array<{ time: number; close: number }>;
        return { symbol: h.symbol, quantity: h.quantity, points: hist };
      },
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    })),
  });

  // Combine histories into a per-day portfolio value series
  const performanceData = useMemo(() => {
    const dayMap = new Map<string, number>();
    for (const r of historicals) {
      if (!r.data?.points?.length) continue;
      const { quantity, points } = r.data as any;
      for (const p of points) {
        const day = new Date(p.time * 1000).toISOString().slice(0, 10);
        dayMap.set(day, (dayMap.get(day) || 0) + p.close * quantity);
      }
    }
    return Array.from(dayMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([day, value]) => ({ day, value }));
  }, [historicals]);

  if (holdings.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Allocation Pie */}
      <Card glass>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-2">Allocation</p>
          {allocation.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
              Waiting for prices…
            </div>
          ) : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocation}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                    label={(e: any) => `${getCategoryLabel(e.name)} ${Math.round((e.value / totalValue) * 100)}%`}
                    labelLine={false}
                  >
                    {allocation.map((entry) => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || "#888"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: any) => formatCurrency(Number(v))}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 30-day performance */}
      <Card glass>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-2">30-Day Performance</p>
          {performanceData.length < 2 ? (
            <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
              Building performance history…
            </div>
          ) : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} hide />
                  <YAxis tick={{ fontSize: 10 }} domain={["dataMin", "dataMax"]} width={50} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: any) => formatCurrency(Number(v))}
                  />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top movers */}
      <Card glass>
        <CardContent className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground">Top Movers</p>
          {best && (
            <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 p-3">
              <AssetLogo symbol={best.symbol} category={best.category} logo={best.logo} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{best.symbol}</p>
                <p className="text-[11px] text-muted-foreground truncate">{best.name}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-green-500 font-semibold text-sm">
                  <ArrowUpRight className="h-3 w-3" />
                  {formatPercentage(best.unrealizedPLPercent)}
                </div>
                <p className={cn("text-[10px]", getChangeColor(best.unrealizedPL))}>
                  {formatCurrency(best.unrealizedPL)}
                </p>
              </div>
            </div>
          )}
          {worst && worst.id !== best?.id && (
            <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <AssetLogo symbol={worst.symbol} category={worst.category} logo={worst.logo} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{worst.symbol}</p>
                <p className="text-[11px] text-muted-foreground truncate">{worst.name}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-red-500 font-semibold text-sm">
                  <ArrowDownRight className="h-3 w-3" />
                  {formatPercentage(worst.unrealizedPLPercent)}
                </div>
                <p className={cn("text-[10px]", getChangeColor(worst.unrealizedPL))}>
                  {formatCurrency(worst.unrealizedPL)}
                </p>
              </div>
            </div>
          )}
          {!best && !worst && (
            <div className="text-xs text-muted-foreground py-6 text-center">
              Waiting for prices to load…
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
