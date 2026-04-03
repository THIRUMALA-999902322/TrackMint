"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Label } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { PieChart as PieChartIcon } from "lucide-react";

interface AllocationData {
  name: string;
  value: number;
  color: string;
}

const COLORS = ["#6366f1", "#00d68f", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

export function AllocationChart({ data }: { data: AllocationData[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card glass>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Asset Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-3">
            <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center">
              <PieChartIcon className="h-8 w-8 opacity-40" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Add holdings to see allocation</p>
              <p className="text-xs mt-1 opacity-70">Your asset mix will appear here</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <div className="w-[160px] h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                    strokeWidth={0}
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        const { cx, cy } = viewBox as { cx: number; cy: number };
                        return (
                          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                            <tspan
                              x={cx}
                              y={cy - 6}
                              className="fill-muted-foreground"
                              fontSize="10"
                            >
                              Total
                            </tspan>
                            <tspan
                              x={cx}
                              y={cy + 10}
                              className="fill-foreground"
                              fontSize="13"
                              fontWeight="600"
                            >
                              {total >= 1000
                                ? `$${(total / 1000).toFixed(1)}k`
                                : `$${total.toFixed(0)}`}
                            </tspan>
                          </text>
                        );
                      }}
                    />
                  </Pie>
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div
                          className="rounded-xl px-3 py-2 text-sm shadow-xl border"
                          style={{
                            background: "hsl(var(--card) / 0.85)",
                            backdropFilter: "blur(12px)",
                            borderColor: "hsl(var(--border) / 0.5)",
                          }}
                        >
                          <p className="font-medium">{d.name}</p>
                          <p className="text-muted-foreground">{formatCurrency(d.value)}</p>
                          <p className="text-xs text-muted-foreground">
                            {total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2.5">
              {data.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {formatCurrency(item.value)}
                    </span>
                    <span className="text-xs font-medium min-w-[40px] text-right">
                      {total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
