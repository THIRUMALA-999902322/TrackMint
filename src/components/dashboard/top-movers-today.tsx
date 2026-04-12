"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { AssetLogo } from "@/components/asset-logo";

interface MoverData {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  category: string;
  logo?: string | null;
}

interface MoversResponse {
  gainers: MoverData[];
  losers: MoverData[];
  summary: string;
}

function MoverRow({ m }: { m: MoverData }) {
  const isGain = m.changePercent >= 0;
  return (
    <div className="flex items-center gap-2.5 py-1.5 px-2 -mx-2 rounded-lg hover:bg-accent/40 transition-colors duration-200">
      <AssetLogo
        symbol={m.symbol}
        category={m.category || "STOCK"}
        logo={m.logo}
        size={28}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{m.symbol}</p>
        <p className="text-xs text-muted-foreground truncate">{m.name}</p>
      </div>
      <div className="text-right flex items-center gap-2 flex-shrink-0">
        <p className="text-xs font-medium">{formatCurrency(m.price)}</p>
        <Badge
          variant={isGain ? "profit" : "loss"}
          className="text-xs min-w-[54px] justify-center"
        >
          {isGain ? "+" : ""}
          {m.changePercent.toFixed(2)}%
        </Badge>
      </div>
    </div>
  );
}

export function TopMoversToday() {
  const { data, isLoading } = useQuery<MoversResponse>({
    queryKey: ["top-movers-today"],
    queryFn: async () => {
      // Use the existing dashboard summary which already has market data
      const res = await fetch("/api/dashboard/summary");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      const d = json.data || {};

      // We get market_assets from the summary endpoint
      const assets: MoverData[] = (d.market_assets || d.top_gainers?.concat(d.top_losers) || []).map(
        (a: any) => ({
          symbol: a.symbol,
          name: a.name,
          price: a.price,
          changePercent: a.changePercent || 0,
          category: a.category || "STOCK",
          logo: a.logo || null,
        })
      );

      const sorted = [...assets].sort(
        (a, b) => b.changePercent - a.changePercent
      );
      const gainers = sorted.filter((a) => a.changePercent > 0).slice(0, 5);
      const losers = sorted
        .filter((a) => a.changePercent < 0)
        .sort((a, b) => a.changePercent - b.changePercent)
        .slice(0, 5);

      // Generate summary text
      const sp = "market";
      let summary = "Markets data loading...";
      if (gainers.length > 0 || losers.length > 0) {
        const topGainer = gainers[0];
        const topLoser = losers[0];
        const parts: string[] = [];
        if (topGainer) {
          parts.push(
            `${topGainer.symbol} leads gains at +${topGainer.changePercent.toFixed(1)}%`
          );
        }
        if (topLoser) {
          parts.push(
            `${topLoser.symbol} drops ${topLoser.changePercent.toFixed(1)}%`
          );
        }
        summary = parts.join(". ") + ".";
      }

      return { gainers, losers, summary };
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card glass className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-violet-500/10 flex items-center justify-center">
              <BarChart3 className="h-3.5 w-3.5 text-violet-500" />
            </div>
            Top Movers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const { gainers = [], losers = [] } = data || {};

  return (
    <Card glass className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-violet-500/10 flex items-center justify-center">
            <BarChart3 className="h-3.5 w-3.5 text-violet-500" />
          </div>
          Top Movers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Gainers */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-profit" />
              <span className="text-xs font-semibold text-profit">Gainers</span>
            </div>
            {gainers.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No gainers today
              </p>
            ) : (
              <div className="space-y-0.5">
                {gainers.map((m) => (
                  <MoverRow key={m.symbol} m={m} />
                ))}
              </div>
            )}
          </div>
          {/* Losers */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingDown className="h-3.5 w-3.5 text-loss" />
              <span className="text-xs font-semibold text-loss">Losers</span>
            </div>
            {losers.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No losers today
              </p>
            ) : (
              <div className="space-y-0.5">
                {losers.map((m) => (
                  <MoverRow key={m.symbol} m={m} />
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
