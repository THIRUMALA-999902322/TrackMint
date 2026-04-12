"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SectorData {
  symbol: string;
  name: string;
  changePercent: number;
}

function getSectorBg(pct: number): string {
  const abs = Math.abs(pct);
  if (pct > 0) {
    if (abs >= 2) return "bg-emerald-600 text-white";
    if (abs >= 1) return "bg-emerald-500/80 text-white";
    if (abs >= 0.5) return "bg-emerald-500/50 text-emerald-100";
    return "bg-emerald-500/25 text-emerald-200";
  }
  if (pct < 0) {
    if (abs >= 2) return "bg-red-600 text-white";
    if (abs >= 1) return "bg-red-500/80 text-white";
    if (abs >= 0.5) return "bg-red-500/50 text-red-100";
    return "bg-red-500/25 text-red-200";
  }
  return "bg-muted text-muted-foreground";
}

export function SectorHeatmap() {
  const { data, isLoading } = useQuery<SectorData[]>({
    queryKey: ["sectors"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/sectors");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 600000, // 10 min
  });

  if (isLoading) {
    return (
      <Card glass className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Globe className="h-3.5 w-3.5 text-blue-500" />
            </div>
            Sectors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[180px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const sectors = data || [];

  return (
    <Card glass className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Globe className="h-3.5 w-3.5 text-blue-500" />
          </div>
          Sectors
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-1.5">
          {sectors.map((s) => (
            <div
              key={s.symbol}
              className={cn(
                "rounded-md px-3 py-2.5 text-center transition-colors",
                getSectorBg(s.changePercent)
              )}
            >
              <p className="text-xs font-medium opacity-90">{s.name}</p>
              <p className="text-sm font-bold mt-0.5">
                {s.changePercent > 0 ? "+" : ""}
                {s.changePercent.toFixed(2)}%
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
