import { NextResponse } from "next/server";
import { getProviderForCategory } from "@/lib/providers";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "1M";
  const symbol = params.id;

  try {
    // Try all providers to find historical data
    const providers = ["STOCK", "CRYPTO", "METAL"];
    let historical: any[] = [];

    for (const cat of providers) {
      const provider = getProviderForCategory(cat);
      historical = await provider.getHistorical(symbol, range as any).catch(() => []);
      if (historical.length > 0) break;
    }

    return NextResponse.json({
      data: { symbol, range, historical },
    });
  } catch (error) {
    return NextResponse.json({ data: { symbol, historical: [] }, error: "Failed" }, { status: 500 });
  }
}
