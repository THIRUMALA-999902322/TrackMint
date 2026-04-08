import { NextResponse } from "next/server";
import { stocksProvider, cryptoProvider, metalsProvider } from "@/lib/providers";

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

    // Generous per-category caps: stocks 12, crypto 8, metals 5. Final cap 20.
    // Stocks don't get logo here (N+1 profile2 calls would kill the request);
    // UI falls back to a gradient icon. Crypto includes logo from CoinGecko.
    const limited = [
      ...stocks.slice(0, 12),
      ...crypto.slice(0, 8),
      ...metals.slice(0, 5),
    ].slice(0, 20);
    return NextResponse.json({ data: limited });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ data: [], error: "Search failed" }, { status: 500 });
  }
}
