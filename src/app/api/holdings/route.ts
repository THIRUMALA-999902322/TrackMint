import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCachedPrice, setCachedPrice } from "@/lib/redis";
import { getProviderForCategory } from "@/lib/providers";

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

async function fetchPrice(
  symbol: string,
  category: string
): Promise<{ price: number; changePercent: number; logo?: string }> {
  // Check cache first
  try {
    const cached = await getCachedPrice(symbol);
    if (cached) {
      const p = typeof cached === "string" ? JSON.parse(cached) : cached;
      if (p.price > 0) {
        return { price: p.price, changePercent: p.changePercent24h || 0, logo: p.logo };
      }
    }
  } catch {}

  // Cache miss — fetch from provider
  try {
    const provider = getProviderForCategory(category);
    const priceData = await provider.getPrice(symbol);
    if (priceData && priceData.price > 0) {
      const ttl = category === "METAL" ? 14400 : 300;
      await setCachedPrice(symbol, priceData, ttl).catch(() => {});
      return {
        price: priceData.price,
        changePercent: priceData.changePercent24h || 0,
        logo: priceData.logo,
      };
    }
  } catch {}

  return { price: 0, changePercent: 0 };
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const holdings = await prisma.holding.findMany({
      where: { user_id: userId },
      include: { asset: true },
      orderBy: { created_at: "desc" },
    });

    const enriched = await Promise.all(
      holdings.map(async (h) => {
        const { price: currentPrice, changePercent, logo } = await fetchPrice(h.asset.symbol, h.asset.category);
        const qty = Number(h.quantity);
        const buyPrice = Number(h.avg_buy_price);
        return {
          id: h.id,
          symbol: h.asset.symbol,
          name: h.asset.name,
          category: h.asset.category,
          quantity: qty,
          avg_buy_price: buyPrice,
          fees: Number(h.fees),
          buy_date: h.buy_date,
          notes: h.notes,
          logo: logo || h.asset.logo_url || null,
          currentPrice,
          changePercent,
          currentValue: currentPrice * qty,
          unrealizedPL: (currentPrice - buyPrice) * qty,
          unrealizedPLPercent: buyPrice > 0 ? ((currentPrice - buyPrice) / buyPrice) * 100 : 0,
        };
      })
    );

    return NextResponse.json({ data: enriched });
  } catch (error) {
    console.error("Holdings error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  try {
    let asset = await prisma.asset.findFirst({
      where: { symbol: body.symbol.toUpperCase(), category: body.category },
    });

    if (!asset) {
      asset = await prisma.asset.create({
        data: {
          symbol: body.symbol.toUpperCase(),
          name: body.name || body.symbol,
          category: body.category,
          source_provider: body.category === "STOCK" ? "finnhub" : body.category === "CRYPTO" ? "coingecko" : "goldapi",
        },
      });
    }

    const holding = await prisma.holding.create({
      data: {
        user_id: userId,
        asset_id: asset.id,
        quantity: body.quantity,
        avg_buy_price: body.avg_buy_price,
        fees: body.fees || 0,
        buy_date: new Date(body.buy_date),
        notes: body.notes,
      },
    });

    return NextResponse.json({ data: holding });
  } catch (error) {
    console.error("Add holding error:", error);
    return NextResponse.json({ error: "Failed to add" }, { status: 500 });
  }
}
