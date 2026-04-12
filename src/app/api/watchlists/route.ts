import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProviderForCategory } from "@/lib/providers";
import { CryptoProvider } from "@/lib/providers/crypto";
import { getCachedPrice, setCachedPrice } from "@/lib/redis";

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

    // Enrich with prices (cache-first, fallback to provider)
    const enriched = await Promise.all(
      watchlist.items.map(async (item) => {
        let price = 0;
        let changePercent = 0;
        let logo: string | undefined;

        // Try cache first
        const cached = await getCachedPrice(item.asset.symbol).catch(() => null);
        if (cached) {
          const p = typeof cached === "string" ? JSON.parse(cached) : cached;
          price = p.price || 0;
          changePercent = p.changePercent24h || 0;
          logo = p.logo;
        }

        // Cache miss — fetch from provider
        if (price === 0) {
          try {
            const provider = getProviderForCategory(item.asset.category);
            const priceData = await provider.getPrice(item.asset.symbol);
            if (priceData && priceData.price > 0) {
              price = priceData.price;
              changePercent = priceData.changePercent24h || 0;
              logo = priceData.logo;
              const ttl = item.asset.category === "METAL" ? 14400 : 300;
              await setCachedPrice(item.asset.symbol, priceData, ttl).catch(() => {});
            }
          } catch {}
        }

        return {
          id: item.id,
          assetId: item.asset_id,
          symbol: item.asset.symbol,
          name: item.asset.name,
          category: item.asset.category,
          logo: logo || item.asset.logo_url || null,
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
  const { symbol, name, category, sourceId } = body;

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
          source_id: sourceId || null,
        },
      });
    } else if (!asset.source_id && sourceId) {
      // Backfill source_id if it was missing
      asset = await prisma.asset.update({
        where: { id: asset.id },
        data: { source_id: sourceId },
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
