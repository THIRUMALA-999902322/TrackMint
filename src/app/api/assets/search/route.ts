import { NextResponse } from "next/server";
import { stocksProvider, cryptoProvider, metalsProvider } from "@/lib/providers";
import { getCachedPrice, setCachedPrice } from "@/lib/redis";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 1) {
    return NextResponse.json({ data: [] });
  }

  try {
    const [stocks, crypto, metals] = await Promise.all([
      stocksProvider.search(query).catch(() => []),
      cryptoProvider.search(query).catch(() => []),
      metalsProvider.search(query).catch(() => []),
    ]);

    // Interleave results: take up to 8 stocks, 5 crypto, 4 metals, then fill remainder
    const limited = [
      ...stocks.slice(0, 8),
      ...crypto.slice(0, 5),
      ...metals.slice(0, 4),
    ].slice(0, 15);
    return NextResponse.json({ data: limited });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ data: [], error: "Search failed" }, { status: 500 });
  }
}
