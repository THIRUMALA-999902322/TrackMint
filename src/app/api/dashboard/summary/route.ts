import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCachedPrice } from "@/lib/redis";
import { newsProvider } from "@/lib/providers";
import { format, subDays } from "date-fns";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
    if (!dbUser) {
      return NextResponse.json({
        data: {
          total_value: 0, total_pnl: 0, total_pnl_pct: 0,
          daily_change: 0, daily_change_pct: 0, holdings_count: 0,
          active_alerts: 0, allocations: [], performance: [],
          top_gainers: [], top_losers: [], news: [], last_updated: new Date().toISOString(),
        },
      });
    }

    const [holdings, alerts] = await Promise.all([
      prisma.holding.findMany({ where: { user_id: dbUser.id }, include: { asset: true } }),
      prisma.alert.count({ where: { user_id: dbUser.id, is_active: true } }),
    ]);

    let totalValue = 0;
    let totalCost = 0;
    const holdingData: any[] = [];
    const categoryTotals: Record<string, number> = {};

    for (const h of holdings) {
      const qty = Number(h.quantity);
      const buyPrice = Number(h.avg_buy_price);
      let currentPrice = buyPrice;

      const cached = await getCachedPrice(h.asset.symbol).catch(() => null);
      if (cached) {
        const p = typeof cached === "string" ? JSON.parse(cached) : cached;
        currentPrice = p.price || buyPrice;
      }

      const value = currentPrice * qty;
      const cost = buyPrice * qty;
      const pl = value - cost;
      const plPct = cost > 0 ? (pl / cost) * 100 : 0;

      totalValue += value;
      totalCost += cost;

      const cat = h.asset.category;
      categoryTotals[cat] = (categoryTotals[cat] || 0) + value;

      holdingData.push({
        symbol: h.asset.symbol,
        name: h.asset.name,
        price: currentPrice,
        changePercent: plPct,
        value,
        pl,
      });
    }

    const totalPL = totalValue - totalCost;
    const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

    // Allocation
    const allocations = Object.entries(categoryTotals).map(([cat, val]) => ({
      name: cat === "STOCK" ? "Stocks" : cat === "CRYPTO" ? "Crypto" : "Metals",
      value: val,
    }));

    // Top movers
    const sorted = [...holdingData].sort((a, b) => b.changePercent - a.changePercent);
    const gainers = sorted.filter((h) => h.changePercent > 0).slice(0, 3);
    const losers = sorted.filter((h) => h.changePercent < 0).slice(-3).reverse();

    // Performance mock (generate from journal entries or use fake data for now)
    const performance = Array.from({ length: 30 }, (_, i) => ({
      date: format(subDays(new Date(), 29 - i), "MMM dd"),
      value: totalValue * (0.9 + Math.random() * 0.2),
    }));
    if (performance.length > 0) performance[performance.length - 1].value = totalValue;

    // News
    let news: any[] = [];
    try {
      news = await newsProvider.getMarketNews();
    } catch {}

    return NextResponse.json({
      data: {
        total_value: totalValue,
        total_cost: totalCost,
        total_pnl: totalPL,
        total_pnl_pct: totalPLPct,
        daily_change: totalPL * 0.05,
        daily_change_pct: totalPLPct * 0.05,
        holdings_count: holdings.length,
        active_alerts: alerts,
        allocations,
        performance,
        top_gainers: gainers,
        top_losers: losers,
        news: news.slice(0, 5),
        last_updated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
