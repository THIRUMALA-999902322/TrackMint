"use client";

import { useQuery } from "@tanstack/react-query";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { AllocationChart } from "@/components/dashboard/allocation-chart";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { RecentNews } from "@/components/dashboard/recent-news";
import { TopMovers } from "@/components/dashboard/top-movers";
import { MarketIndices } from "@/components/dashboard/market-indices";
import { FearGreedGauge } from "@/components/dashboard/fear-greed-gauge";
import { SectorHeatmap } from "@/components/dashboard/sector-heatmap";
import { TopMoversToday } from "@/components/dashboard/top-movers-today";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

async function fetchDashboard() {
  const res = await fetch("/api/dashboard/summary");
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  return res.json();
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Loading your portfolio...</p>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-[72px] min-w-[180px] rounded-lg flex-shrink-0" />
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-[280px] lg:col-span-2" />
          <Skeleton className="h-[280px]" />
        </div>
      </div>
    );
  }

  const d = data?.data || {};
  const isMarketOverview = d.is_market_overview === true;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {formatDate(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isMarketOverview && (
            <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
              Market Overview
            </span>
          )}
          {d.last_updated && (
            <p className="text-xs text-muted-foreground">
              Updated {formatDate(d.last_updated, "h:mm a")}
            </p>
          )}
        </div>
      </div>

      {/* Live Market Indices Bar */}
      <MarketIndices />

      {/* Fear & Greed + Sectors + Top Movers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <FearGreedGauge />
        <SectorHeatmap />
        <TopMoversToday />
      </div>

      {/* Portfolio Stats */}
      <StatsCards
        totalValue={isMarketOverview ? (d.market_total || 0) : (d.total_value || 0)}
        totalPL={d.total_pnl || 0}
        totalPLPercent={d.total_pnl_pct || 0}
        todayPL={d.daily_change || 0}
        todayPLPercent={d.daily_change_pct || 0}
        holdingsCount={d.holdings_count || 0}
        activeAlerts={d.active_alerts || 0}
        isMarketOverview={isMarketOverview}
      />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PerformanceChart
            data={d.performance || []}
            title={isMarketOverview ? "Market Performance (BTC)" : "Portfolio Performance"}
          />
        </div>
        <AllocationChart data={d.allocations || []} />
      </div>

      <TopMovers
        gainers={d.top_gainers || []}
        losers={d.top_losers || []}
      />

      <RecentNews news={d.news || []} />

      <p className="text-xs text-muted-foreground text-center py-4">
        Data provided for informational purposes only. Not financial advice.
      </p>
    </div>
  );
}
