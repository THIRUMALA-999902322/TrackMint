import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProviderForCategory } from "@/lib/providers";
import { getCachedPrice } from "@/lib/redis";

async function getUserId() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: { email: user.email!, name: user.user_metadata?.name },
    });
  }
  return dbUser.id;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    let watchlist = await prisma.watchlist.findFirst({
      where: { user_id: userId },
      include: { items: { include: { asset: true }, orderBy: { created_at: "desc" } } },
    });

    if (!watchlist) {
      watchlist = await prisma.watchlist.create({
        data: { user_id: userId, name: "Default" },
        include: { items: { include: { asset: true } } },
      });
    }

    // Enrich with prices
    const enriched = await Promise.all(
      watchlist.items.map(async (item) => {
        let price = 0;
        let changePercent = 0;
        const cached = await getCachedPrice(item.asset.symbol).catch(() => null);
        if (cached) {
          const p = typeof cached === "string" ? JSON.parse(cached) : cached;
          price = p.price || 0;
          changePercent = p.changePercent24h || 0;
        }
        return {
          id: item.id,
          assetId: item.asset_id,
          symbol: item.asset.symbol,
          name: item.asset.name,
          category: item.asset.category,
          price,
          changePercent,
          createdAt: item.created_at,
        };
      })
    );

    return NextResponse.json({ data: { ...watchlist, items: enriched } });
  } catch (error) {
    console.error("Watchlist error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { symbol, name, category } = body;

  try {
    // Get or create asset
    let asset = await prisma.asset.findFirst({
      where: { symbol: symbol.toUpperCase(), category },
    });

    if (!asset) {
      asset = await prisma.asset.create({
        data: {
          symbol: symbol.toUpperCase(),
          name: name || symbol,
          category,
          source_provider: category === "STOCK" ? "finnhub" : category === "CRYPTO" ? "coingecko" : "goldapi",
        },
      });
    }

    // Get or create watchlist
    let watchlist = await prisma.watchlist.findFirst({ where: { user_id: userId } });
    if (!watchlist) {
      watchlist = await prisma.watchlist.create({ data: { user_id: userId, name: "Default" } });
    }

    // Add item (ignore if already exists)
    await prisma.watchlistItem.upsert({
      where: { uq_watchlist_asset: { watchlist_id: watchlist.id, asset_id: asset.id } },
      create: { watchlist_id: watchlist.id, asset_id: asset.id },
      update: {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Add watchlist error:", error);
    return NextResponse.json({ error: "Failed to add" }, { status: 500 });
  }
}
