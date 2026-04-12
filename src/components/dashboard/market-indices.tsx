"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface IndexData {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

function formatCompact(value: number): string {
  if (value >= 10000) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function MarketIndices() {
  const { data, isLoading } = useQuery<IndexData[]>({
    queryKey: ["market-indices"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/market-indices");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 300000, // 5 min
  });

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-[72px] min-w-[180px] rounded-lg flex-shrink-0" />
        ))}
      </div>
    );
  }

  const indices = data || [];

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
      {indices.map((idx) => {
        const isUp = idx.changePercent > 0;
        const isDown = idx.changePercent < 0;
        const ArrowIcon = isUp ? ArrowUp : isDown ? ArrowDown : Minus;

        return (
          <div
            key={idx.symbol}
            className={cn(
              "glass-card rounded-lg border px-4 py-3 min-w-[180px] flex-shrink-0",
              "bg-card/50 backdrop-blur-sm",
              "hover:shadow-md transition-shadow duration-200"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground font-medium truncate">
                {idx.name}
              </span>
              <ArrowIcon
                className={cn(
                  "h-3.5 w-3.5 flex-shrink-0",
                  isUp && "text-profit",
                  isDown && "text-loss",
                  !isUp && !isDown && "text-muted-foreground"
                )}
              />
            </div>
            <p className="text-base font-bold">{formatCompact(idx.value)}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={cn(
                  "text-xs font-semibold",
                  isUp && "text-profit",
                  isDown && "text-loss",
                  !isUp && !isDown && "text-muted-foreground"
                )}
              >
                {isUp ? "+" : ""}
                {idx.changePercent.toFixed(2)}%
              </span>
              <span className="text-xs text-muted-foreground">
                ({isUp ? "+" : ""}
                {idx.change.toFixed(2)})
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
