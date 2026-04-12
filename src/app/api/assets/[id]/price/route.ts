import { NextResponse } from "next/server";
import { getProviderForCategory } from "@/lib/providers";
import { CryptoProvider } from "@/lib/providers/crypto";
import { getCachedPrice, setCachedPrice } from "@/lib/redis";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const symbol = params.id.toUpperCase();

  try {
    // Look up asset in DB for name/category hint and source_id
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
      let price;
      // For crypto, pass the source_id so CoinGecko ID resolves correctly
      if (cat === "CRYPTO") {
        const cryptoProvider = getProviderForCategory(cat) as CryptoProvider;
        const sourceId = dbAsset?.category === "CRYPTO" ? (dbAsset.source_id ?? undefined) : undefined;
        price = await cryptoProvider.getPrice(symbol, sourceId).catch(() => null);
      } else {
        const provider = getProviderForCategory(cat);
        price = await provider.getPrice(symbol).catch(() => null);
      }

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
