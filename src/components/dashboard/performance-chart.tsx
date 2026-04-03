"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

interface DataPoint {
  date: string;
  value: number;
}

export function PerformanceChart({ data }: { data: DataPoint[] }) {
  const [range, setRange] = useState("1M");

  const rangeFilter: Record<string, number> = {
    "1W": 7, "1M": 30, "3M": 90, "1Y": 365, "ALL": 99999,
  };

  const filtered = data.slice(-(rangeFilter[range] || 30));
  const isPositive = filtered.length > 1 ? filtered[filtered.length - 1].value >= filtered[0].value : true;

  return (
    <Card glass>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Portfolio Performance</CardTitle>
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
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            No data yet
          </div>
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filtered}>
                <defs>
                  <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isPositive ? "#00d68f" : "#ff6b6b"} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={isPositive ? "#00d68f" : "#ff6b6b"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis hide domain={["dataMin", "dataMax"]} />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    return (
                      <div className="bg-card border rounded-lg px-3 py-2 text-sm shadow-lg">
                        <p className="text-muted-foreground">{payload[0].payload.date}</p>
                        <p className="font-medium">{formatCurrency(payload[0].value as number)}</p>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={isPositive ? "#00d68f" : "#ff6b6b"}
                  fill="url(#perfGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
