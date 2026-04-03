"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercentage, cn, getChangeColor } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Mover {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
}

export function TopMovers({ gainers, losers }: { gainers: Mover[]; losers: Mover[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card glass>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-profit" /> Top Gainers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gainers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data</p>
          ) : (
            <div className="space-y-2">
              {gainers.map((m) => (
                <div key={m.symbol} className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium">{m.symbol}</p>
                    <p className="text-xs text-muted-foreground">{m.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{formatCurrency(m.price)}</p>
                    <Badge variant="profit" className="text-xs">{formatPercentage(m.changePercent)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card glass>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-loss" /> Top Losers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {losers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data</p>
          ) : (
            <div className="space-y-2">
              {losers.map((m) => (
                <div key={m.symbol} className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium">{m.symbol}</p>
                    <p className="text-xs text-muted-foreground">{m.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{formatCurrency(m.price)}</p>
                    <Badge variant="loss" className="text-xs">{formatPercentage(m.changePercent)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
