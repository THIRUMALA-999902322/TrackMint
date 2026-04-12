"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";
import { Crosshair } from "lucide-react";

interface PriceChartPickerProps {
  symbol: string;
  category: string;
  currentPrice?: number;
  onPriceSelect: (price: number, date: string) => void;
}

export function PriceChartPicker({ symbol, category, currentPrice, onPriceSelect }: PriceChartPickerProps) {
  const [selected, setSelected] = useState<{ price: number; date: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["price-picker", symbol, category],
    queryFn: async () => {
      const res = await fetch(`/api/assets/${encodeURIComponent(symbol)}?range=1Y&category=${category}`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return (json?.data?.historical || []).map((p: any) => ({
        time: p.time,
        date: new Date(p.time * 1000).toISOString().split("T")[0],
        label: new Date(p.time * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        price: p.close || p.open,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleClick = useCallback(
    (e: any) => {
      if (!e?.activePayload?.[0]) return;
      const point = e.activePayload[0].payload;
      const price = Math.round(point.price * 100) / 100;
      const date = point.date;
      setSelected({ price, date });
      onPriceSelect(price, date);
    },
    [onPriceSelect]
  );

  if (isLoading) {
    return <Skeleton className="h-[200px] w-full rounded-lg" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground border rounded-lg bg-muted/20">
        No historical data available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Crosshair className="h-3 w-3" /> Click chart to select buy price
        </span>
        {selected && (
          <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
            Selected: {formatCurrency(selected.price)} on {selected.date}
          </Badge>
        )}
      </div>
      <div className="h-[200px] cursor-crosshair rounded-lg border bg-card/30 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} onClick={handleClick}>
            <defs>
              <linearGradient id="pickerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#888" }}
              tickLine={false}
              axisLine={false}
              interval={Math.max(0, Math.floor(data.length / 5))}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#888" }}
              tickLine={false}
              axisLine={false}
              domain={["dataMin", "dataMax"]}
              width={50}
              tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}`}
            />
            {currentPrice && currentPrice > 0 && (
              <ReferenceLine
                y={currentPrice}
                stroke="hsl(var(--primary))"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
              />
            )}
            <Tooltip
              content={({ payload }) => {
                if (!payload?.length) return null;
                const p = payload[0].payload;
                return (
                  <div className="bg-card/90 backdrop-blur-md border rounded-lg px-3 py-2 text-xs shadow-lg">
                    <p className="text-muted-foreground">{p.date}</p>
                    <p className="font-bold text-sm">{formatCurrency(p.price)}</p>
                    <p className="text-[10px] text-primary mt-1">Click to select</p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              fill="url(#pickerGrad)"
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {currentPrice && currentPrice > 0 && (
        <p className="text-xs text-muted-foreground">
          Current price: <span className="font-semibold text-foreground">{formatCurrency(currentPrice)}</span>
          <span className="text-[10px] ml-1">(dashed line)</span>
        </p>
      )}
    </div>
  );
}
