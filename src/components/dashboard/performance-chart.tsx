"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";

interface DataPoint {
  date: string;
  value: number;
}

export function PerformanceChart({
  data,
  title = "Portfolio Performance",
}: {
  data: DataPoint[];
  title?: string;
}) {
  const [range, setRange] = useState("1M");
  const [isAnimated, setIsAnimated] = useState(false);

  const rangeFilter: Record<string, number> = {
    "1W": 7, "1M": 30, "3M": 90, "1Y": 365, "ALL": 99999,
  };

  const filtered = data.slice(-(rangeFilter[range] || 30));
  const isPositive = filtered.length > 1 ? filtered[filtered.length - 1].value >= filtered[0].value : true;
  const gradientId = `perfGrad-${isPositive ? "up" : "down"}`;

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Card glass>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Tabs defaultValue="1M" value={range} onValueChange={setRange}>
          <TabsList className="h-8">
            {["1W", "1M", "3M", "1Y", "ALL"].map((r) => (
              <TabsTrigger key={r} value={r} className="text-xs px-2 py-1">{r}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground gap-3">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="56" width="8" height="16" rx="2" fill="currentColor" opacity="0.15" />
              <rect x="20" y="44" width="8" height="28" rx="2" fill="currentColor" opacity="0.2" />
              <rect x="32" y="36" width="8" height="36" rx="2" fill="currentColor" opacity="0.25" />
              <rect x="44" y="28" width="8" height="44" rx="2" fill="currentColor" opacity="0.3" />
              <rect x="56" y="20" width="8" height="52" rx="2" fill="currentColor" opacity="0.35" />
              <path d="M8 48 L20 36 L32 40 L44 24 L56 16 L68 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
              <circle cx="68" cy="8" r="3" fill="currentColor" opacity="0.5" />
            </svg>
            <div className="text-center">
              <p className="text-sm font-medium">No performance data yet</p>
              <p className="text-xs mt-1 opacity-70">Add holdings to start tracking your portfolio</p>
            </div>
          </div>
        ) : (
          <div
            className="h-[220px]"
            style={{
              opacity: isAnimated ? 1 : 0,
              transform: isAnimated ? "translateY(0)" : "translateY(8px)",
              transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filtered} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isPositive ? "#00d68f" : "#ff6b6b"} stopOpacity={0.25} />
                    <stop offset="50%" stopColor={isPositive ? "#00d68f" : "#ff6b6b"} stopOpacity={0.08} />
                    <stop offset="100%" stopColor={isPositive ? "#00d68f" : "#ff6b6b"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  interval={Math.max(0, Math.floor(filtered.length / 6) - 1)}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(val) =>
                    val >= 1000 ? `$${(val / 1000).toFixed(1)}k` : `$${val.toFixed(0)}`
                  }
                  width={54}
                />
                <Tooltip
                  content={({ payload, active }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div
                        className="rounded-xl px-4 py-3 text-sm shadow-xl border"
                        style={{
                          background: "hsl(var(--card) / 0.85)",
                          backdropFilter: "blur(12px)",
                          borderColor: "hsl(var(--border) / 0.5)",
                        }}
                      >
                        <p className="text-muted-foreground text-xs mb-1">{payload[0].payload.date}</p>
                        <p className="font-semibold text-base">{formatCurrency(payload[0].value as number)}</p>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotoneX"
                  dataKey="value"
                  stroke={isPositive ? "#00d68f" : "#ff6b6b"}
                  fill={`url(#${gradientId})`}
                  strokeWidth={2.5}
                  dot={false}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
