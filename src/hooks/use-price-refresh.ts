"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Auto-refresh agent: warms the price cache every 2 minutes by calling
 * /api/cron/refresh-prices (GET — no auth required), then invalidates
 * React Query caches so holdings/watchlist re-render with fresh prices.
 */
export function usePriceRefresh(interval = 120_000) {
  const queryClient = useQueryClient();
  const active = useRef(true);

  useEffect(() => {
    active.current = true;

    async function refresh() {
      if (!active.current) return;
      try {
        await fetch("/api/cron/refresh-prices");
        // Invalidate all data queries so UI re-fetches from warm cache
        queryClient.invalidateQueries({ queryKey: ["holdings"] });
        queryClient.invalidateQueries({ queryKey: ["watchlist"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      } catch {}
    }

    // Initial warm-up on mount (delayed slightly to not block page load)
    const warmup = setTimeout(refresh, 3000);
    const timer = setInterval(refresh, interval);

    return () => {
      active.current = false;
      clearTimeout(warmup);
      clearInterval(timer);
    };
  }, [interval, queryClient]);
}
