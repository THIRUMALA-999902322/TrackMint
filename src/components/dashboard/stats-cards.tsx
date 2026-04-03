"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatPercentage, getChangeColor, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Bell, Briefcase } from "lucide-react";

interface StatsCardsProps {
  totalValue: number;
  totalPL: number;
  totalPLPercent: number;
  todayPL: number;
  todayPLPercent: number;
  holdingsCount: number;
  activeAlerts: number;
}

export function StatsCards({
  totalValue, totalPL, totalPLPercent, todayPL, todayPLPercent, holdingsCount, activeAlerts,
}: StatsCardsProps) {
  const stats = [
    {
      label: "Portfolio Value",
      value: formatCurrency(totalValue),
      icon: DollarSign,
      color: "text-primary",
    },
    {
      label: "Total P/L",
      value: formatCurrency(Math.abs(totalPL)),
      sub: formatPercentage(totalPLPercent),
      icon: totalPL >= 0 ? TrendingUp : TrendingDown,
      color: getChangeColor(totalPL),
    },
    {
      label: "Today",
      value: formatCurrency(Math.abs(todayPL)),
      sub: formatPercentage(todayPLPercent),
      icon: todayPL >= 0 ? TrendingUp : TrendingDown,
      color: getChangeColor(todayPL),
    },
    {
      label: "Holdings",
      value: holdingsCount.toString(),
      icon: Briefcase,
      color: "text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} glass>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </div>
            <p className={cn("text-xl font-bold", stat.color === "text-primary" ? "" : stat.color)}>
              {stat.value}
            </p>
            {stat.sub && (
              <p className={cn("text-xs mt-1", stat.color)}>{stat.sub}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
