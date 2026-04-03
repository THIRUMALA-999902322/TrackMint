import { NextResponse } from "next/server";
import { getProviderForCategory } from "@/lib/providers";
import { getCachedPrice, setCachedPrice } from "@/lib/redis";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const symbol = params.id.toUpperCase();

  try {
    // Check cache first
    const cached = await getCachedPrice(symbol);
    if (cached) {
      const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
      return NextResponse.json({ data: parsed });
    }

    // Try each provider
    const categories = ["STOCK", "CRYPTO", "METAL"];
    for (const cat of categories) {
      const provider = getProviderForCategory(cat);
      const price = await provider.getPrice(symbol).catch(() => null);
      if (price && price.price > 0) {
        const result = { ...price, category: cat };
        await setCachedPrice(symbol, result, cat === "METAL" ? 14400 : 300);
        return NextResponse.json({ data: result });
      }
    }

    return NextResponse.json({ data: null, error: "Asset not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ data: null, error: "Failed to fetch price" }, { status: 500 });
  }
}
