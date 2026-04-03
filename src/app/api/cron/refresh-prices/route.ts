import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getProviderForCategory } from "@/lib/providers";
import { setCachedPrice } from "@/lib/redis";

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all unique assets from watchlists and holdings
    const assets = await prisma.asset.findMany({
      where: {
        OR: [
          { watchlist_items: { some: {} } },
          { holdings: { some: {} } },
          { alerts: { some: { is_active: true } } },
        ],
      },
    });

    // Group by category
    const grouped: Record<string, typeof assets> = {};
    for (const asset of assets) {
      const cat = asset.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(asset);
    }

    let updated = 0;

    for (const [category, categoryAssets] of Object.entries(grouped)) {
      const provider = getProviderForCategory(category);
      const symbols = categoryAssets.map((a) => a.symbol);

      const prices = await provider.getPrices(symbols);

      for (const price of prices) {
        const asset = categoryAssets.find((a) => a.symbol === price.symbol);
        if (!asset) continue;

        // Cache in Redis
        const ttl = category === "METAL" ? 14400 : 300;
        await setCachedPrice(price.symbol, { ...price, category }, ttl);

        // Update DB price cache
        await prisma.priceCache.upsert({
          where: { asset_id: asset.id },
          create: {
            asset_id: asset.id,
            price: price.price,
            currency: "USD",
            source_provider: asset.source_provider,
            fetched_at: new Date(),
          },
          update: {
            price: price.price,
            fetched_at: new Date(),
          },
        });

        updated++;
      }
    }

    return NextResponse.json({ success: true, updated, total: assets.length });
  } catch (error) {
    console.error("Refresh prices error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
