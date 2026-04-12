"use client";

import { usePriceRefresh } from "@/hooks/use-price-refresh";

export function PriceRefreshProvider({ children }: { children: React.ReactNode }) {
  usePriceRefresh();
  return <>{children}</>;
}
