import { NextResponse } from "next/server";
import { getProviderForCategory } from "@/lib/providers";
import { getCachedPrice, setCachedPrice } from "@/lib/redis";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const symbol = params.id.toUpperCase();

  try {
    // Look up asset in DB for name/category hint
    const dbAsset = await prisma.asset.findFirst({
      where: { symbol },
    }).catch(() => null);

    // Check cache first
    const cached = await getCachedPrice(symbol);
    if (cached) {
      const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
      if (!parsed.name && dbAsset) parsed.name = dbAsset.name;
      if (!parsed.category && dbAsset) parsed.category = dbAsset.category;
      return NextResponse.json({ data: parsed });
    }

    // If we know the category from DB, try that first
    const categoriesToTry = dbAsset
      ? [dbAsset.category, ...["STOCK", "CRYPTO", "METAL"].filter(c => c !== dbAsset.category)]
      : ["STOCK", "CRYPTO", "METAL"];

    for (const cat of categoriesToTry) {
      const provider = getProviderForCategory(cat);
      const price = await provider.getPrice(symbol).catch(() => null);
      if (price && price.price > 0) {
        const result = {
          ...price,
          category: cat,
          name: dbAsset?.name || price.symbol || symbol,
        };
        await setCachedPrice(symbol, result, cat === "METAL" ? 14400 : 300);
        return NextResponse.json({ data: result });
      }
    }

    return NextResponse.json({ data: null, error: "Asset not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ data: null, error: "Failed to fetch price" }, { status: 500 });
  }
}
