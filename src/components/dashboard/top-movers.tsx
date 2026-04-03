"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercentage, cn, getChangeColor } from "@/lib/utils";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

interface Mover {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
}

function EmptyState({ type }: { type: "gainers" | "losers" }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2">
      <div className="h-10 w-10 rounded-full bg-muted/30 flex items-center justify-center">
        <BarChart3 className="h-5 w-5 opacity-40" />
      </div>
      <p className="text-xs text-center">
        {type === "gainers"
          ? "Add holdings to track gainers"
          : "Add holdings to track losers"}
      </p>
    </div>
  );
}

function MoverRow({ m }: { m: Mover }) {
  const isGain = m.changePercent >= 0;
  return (
    <div className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-accent/40 transition-colors duration-200 group">
      <div>
        <p className="text-sm font-semibold group-hover:text-primary transition-colors">{m.symbol}</p>
        <p className="text-xs text-muted-foreground truncate max-w-[120px]">{m.name}</p>
      </div>
      <div className="text-right flex items-center gap-3">
        <p className="text-sm font-medium">{formatCurrency(m.price)}</p>
        <Badge
          variant={isGain ? "profit" : "loss"}
          className="text-xs min-w-[60px] justify-center"
        >
          {isGain ? "+" : ""}{formatPercentage(m.changePercent)}
        </Badge>
      </div>
    </div>
  );
}

export function TopMovers({ gainers, losers }: { gainers: Mover[]; losers: Mover[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card glass className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-profit" />
            </div>
            Top Gainers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gainers.length === 0 ? (
            <EmptyState type="gainers" />
          ) : (
            <div className="space-y-0.5">
              {gainers.map((m) => (
                <MoverRow key={m.symbol} m={m} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card glass className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-red-500/10 flex items-center justify-center">
              <TrendingDown className="h-3.5 w-3.5 text-loss" />
            </div>
            Top Losers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {losers.length === 0 ? (
            <EmptyState type="losers" />
          ) : (
            <div className="space-y-0.5">
              {losers.map((m) => (
                <MoverRow key={m.symbol} m={m} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
