import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { newsProvider } from "@/lib/providers";
import { setCachedNews } from "@/lib/redis";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get assets from active watchlists
    const assets = await prisma.asset.findMany({
      where: { watchlist_items: { some: {} } },
      take: 20, // Limit to stay within API quotas
    });

    let refreshed = 0;

    for (const asset of assets) {
      const news = await newsProvider.getNews(asset.symbol, asset.category).catch(() => []);
      if (news.length === 0) continue;

      // Cache in Redis
      await setCachedNews(asset.symbol, news, 1800);

      // Store in DB (upsert by URL to avoid duplicates)
      for (const item of news.slice(0, 5)) {
        await prisma.newsItem.upsert({
          where: { id: `${asset.id}-${Buffer.from(item.url).toString("base64").slice(0, 20)}` },
          create: {
            asset_id: asset.id,
            headline: item.headline,
            url: item.url,
            source_name: item.source,
            sentiment: item.sentiment as any,
            published_at: new Date(item.publishedAt),
          },
          update: {},
        }).catch(() => {
          // Ignore upsert conflicts
        });
      }

      refreshed++;
    }

    return NextResponse.json({ success: true, refreshed, total: assets.length });
  } catch (error) {
    console.error("Refresh news error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
