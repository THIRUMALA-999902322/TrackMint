import { NextResponse } from "next/server";
import { getProviderForCategory } from "@/lib/providers";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "1M";
  const category = searchParams.get("category");
  const symbol = params.id;

  try {
    let historical: any[] = [];

    // If category is known, try that provider first
    if (category) {
      const provider = getProviderForCategory(category);
      historical = await provider.getHistorical(symbol, range as any).catch(() => []);
    }

    // If still empty, try all providers
    if (historical.length === 0) {
      const providers = ["STOCK", "CRYPTO", "METAL"];
      for (const cat of providers) {
        if (cat === category) continue; // skip already tried
        const provider = getProviderForCategory(cat);
        historical = await provider.getHistorical(symbol, range as any).catch(() => []);
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
