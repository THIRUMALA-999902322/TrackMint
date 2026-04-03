import { NextResponse } from "next/server";
import { newsProvider } from "@/lib/providers";
import { getCachedNews, setCachedNews } from "@/lib/redis";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const symbol = params.id.toUpperCase();

  try {
    const cached = await getCachedNews(symbol);
    if (cached && cached.length > 0) {
      return NextResponse.json({ data: cached });
    }

    const news = await newsProvider.getNews(symbol);
    if (news.length > 0) {
      await setCachedNews(symbol, news, 1800);
    }

    return NextResponse.json({ data: news });
  } catch (error) {
    return NextResponse.json({ data: [], error: "Failed to fetch news" }, { status: 500 });
  }
}
