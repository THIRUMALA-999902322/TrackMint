import { NextResponse } from "next/server";
import { getProviderForCategory } from "@/lib/providers";
import { CryptoProvider } from "@/lib/providers/crypto";
import { prisma } from "@/lib/db";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "1M";
  const category = searchParams.get("category");
  const symbol = params.id;

  try {
    // Look up asset in DB for source_id (needed for non-hardcoded crypto)
    const dbAsset = await prisma.asset.findFirst({
      where: { symbol: symbol.toUpperCase() },
    }).catch(() => null);

    let historical: any[] = [];

    // Helper to fetch historical, passing source_id for crypto
    const fetchHistorical = async (cat: string) => {
      if (cat === "CRYPTO") {
        const cryptoProvider = getProviderForCategory(cat) as CryptoProvider;
        const sourceId = dbAsset?.category === "CRYPTO" ? (dbAsset.source_id ?? undefined) : undefined;
        return cryptoProvider.getHistorical(symbol, range, sourceId).catch(() => []);
      }
      const provider = getProviderForCategory(cat);
      return provider.getHistorical(symbol, range as any).catch(() => []);
    };

    // If category is known, try that provider first
    if (category) {
      historical = await fetchHistorical(category);
    }

    // If still empty, try all providers
    if (historical.length === 0) {
      const providers = ["STOCK", "CRYPTO", "METAL"];
      for (const cat of providers) {
        if (cat === category) continue; // skip already tried
        historical = await fetchHistorical(cat);
        if (historical.length > 0) break;
      }
    }

    return NextResponse.json({
      data: { symbol, range, historical },
    });
  } catch (error) {
    return NextResponse.json({ data: { symbol, historical: [] }, error: "Failed" }, { status: 500 });
  }
}
