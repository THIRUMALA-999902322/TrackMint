import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_ASSETS = [
  // Stocks
  { symbol: "AAPL", name: "Apple Inc.", category: "STOCK", source_provider: "finnhub" },
  { symbol: "MSFT", name: "Microsoft Corporation", category: "STOCK", source_provider: "finnhub" },
  { symbol: "GOOGL", name: "Alphabet Inc.", category: "STOCK", source_provider: "finnhub" },
  { symbol: "AMZN", name: "Amazon.com Inc.", category: "STOCK", source_provider: "finnhub" },
  { symbol: "TSLA", name: "Tesla Inc.", category: "STOCK", source_provider: "finnhub" },
  { symbol: "NVDA", name: "NVIDIA Corporation", category: "STOCK", source_provider: "finnhub" },
  { symbol: "META", name: "Meta Platforms Inc.", category: "STOCK", source_provider: "finnhub" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", category: "STOCK", source_provider: "finnhub" },
  // Crypto
  { symbol: "BTC", name: "Bitcoin", category: "CRYPTO", source_provider: "coingecko" },
  { symbol: "ETH", name: "Ethereum", category: "CRYPTO", source_provider: "coingecko" },
  { symbol: "SOL", name: "Solana", category: "CRYPTO", source_provider: "coingecko" },
  { symbol: "BNB", name: "BNB", category: "CRYPTO", source_provider: "coingecko" },
  { symbol: "XRP", name: "Ripple", category: "CRYPTO", source_provider: "coingecko" },
  { symbol: "ADA", name: "Cardano", category: "CRYPTO", source_provider: "coingecko" },
  { symbol: "DOGE", name: "Dogecoin", category: "CRYPTO", source_provider: "coingecko" },
  // Metals
  { symbol: "XAU", name: "Gold", category: "METAL", source_provider: "goldapi" },
  { symbol: "XAG", name: "Silver", category: "METAL", source_provider: "goldapi" },
  { symbol: "XPT", name: "Platinum", category: "METAL", source_provider: "goldapi" },
  { symbol: "XPD", name: "Palladium", category: "METAL", source_provider: "goldapi" },
];

async function main() {
  console.log("Seeding database...");

  // Seed assets
  for (const asset of DEMO_ASSETS) {
    await prisma.asset.upsert({
      where: { uq_asset_symbol_category: { symbol: asset.symbol, category: asset.category as any } },
      create: asset as any,
      update: {},
    });
  }

  console.log(`Seeded ${DEMO_ASSETS.length} assets`);
  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
