"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatPercentage, getChangeColor, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Bell, Briefcase } from "lucide-react";
import { useEffect, useState } from "react";

interface StatsCardsProps {
  totalValue: number;
  totalPL: number;
  totalPLPercent: number;
  todayPL: number;
  todayPLPercent: number;
  holdingsCount: number;
  activeAlerts: number;
  isMarketOverview?: boolean;
}

function AnimatedValue({ value, className }: { value: string; className?: string }) {
  const [displayed, setDisplayed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDisplayed(true), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <p
      className={cn(
        "text-base sm:text-xl font-bold transition-all duration-500",
        displayed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1",
        className
      )}
    >
      {value}
    </p>
  );
}

const iconBgColors: Record<string, string> = {
  "Portfolio Value": "bg-primary/10",
  "Market Overview": "bg-primary/10",
  "Total P/L": "bg-emerald-500/10",
  "Today": "bg-blue-500/10",
  "Holdings": "bg-violet-500/10",
};

const iconAccents: Record<string, string> = {
  "Portfolio Value": "text-primary",
  "Market Overview": "text-primary",
  "Total P/L": "",
  "Today": "",
  "Holdings": "text-violet-500",
};

export function StatsCards({
  totalValue, totalPL, totalPLPercent, todayPL, todayPLPercent, holdingsCount, activeAlerts,
  isMarketOverview = false,
}: StatsCardsProps) {
  const isEmpty = totalValue === 0 && holdingsCount === 0 && !isMarketOverview;

  const stats = [
    {
      label: isMarketOverview ? "Market Overview" : "Portfolio Value",
      value: isEmpty ? "Add holdings to track" : formatCurrency(totalValue),
      icon: DollarSign,
      color: "text-primary",
      accentBorder: "from-primary/20 to-primary/5",
    },
    {
      label: "Total P/L",
      value: isEmpty ? "--" : formatCurrency(Math.abs(totalPL)),
      sub: isEmpty ? undefined : formatPercentage(totalPLPercent),
      icon: totalPL >= 0 ? TrendingUp : TrendingDown,
      color: isEmpty ? "text-muted-foreground" : getChangeColor(totalPL),
      accentBorder: totalPL >= 0 ? "from-emerald-500/20 to-emerald-500/5" : "from-red-500/20 to-red-500/5",
    },
    {
      label: "Today",
      value: isEmpty ? "--" : formatCurrency(Math.abs(todayPL)),
      sub: isEmpty ? undefined : formatPercentage(todayPLPercent),
      icon: todayPL >= 0 ? TrendingUp : TrendingDown,
      color: isEmpty ? "text-muted-foreground" : getChangeColor(todayPL),
      accentBorder: todayPL >= 0 ? "from-blue-500/20 to-blue-500/5" : "from-red-500/20 to-red-500/5",
    },
    {
      label: "Holdings",
      value: isEmpty ? "0" : holdingsCount.toString(),
      sub: isEmpty ? "Get started" : undefined,
      icon: Briefcase,
      color: isEmpty ? "text-muted-foreground" : "text-violet-500",
      accentBorder: "from-violet-500/20 to-violet-500/5",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card
          key={stat.label}
          glass
          className="relative overflow-hidden group hover:shadow-md transition-shadow duration-300"
        >
          {/* Subtle gradient accent at top */}
          <div
            className={cn(
              "absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r opacity-60",
              stat.accentBorder
            )}
          />
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium truncate mr-2">{stat.label}</span>
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                  iconBgColors[stat.label] || "bg-muted/50"
                )}
              >
                <stat.icon
                  className={cn(
                    "h-4 w-4",
                    iconAccents[stat.label] || stat.color
                  )}
                />
              </div>
            </div>
            <AnimatedValue
              value={stat.value}
              className={cn(
                "truncate",
                stat.color === "text-primary" || stat.color === "text-violet-500" || stat.color === "text-muted-foreground" ? "" : stat.color
              )}
            />
            {stat.sub && (
              <p className={cn("text-xs mt-1 font-medium truncate", isEmpty ? "text-muted-foreground" : stat.color)}>
                {stat.sub}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
