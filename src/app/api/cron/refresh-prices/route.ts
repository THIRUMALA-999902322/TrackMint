import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getProviderForCategory } from "@/lib/providers";
import { setCachedPrice } from "@/lib/redis";

// This endpoint can be called by cron OR by the client-side auto-refresh agent
// When called without auth (GET), it refreshes prices for the calling user's assets.
// When called with cron auth (POST), it refreshes ALL tracked assets.

export async function GET() {
  // Public — called by client auto-refresh. No auth needed since it only
  // warms the global price cache (not user-specific data).
  try {
    const assets = await prisma.asset.findMany({
      where: {
        OR: [
          { watchlist_items: { some: {} } },
          { holdings: { some: {} } },
          { alerts: { some: { is_active: true } } },
        ],
      },
      take: 50, // cap to avoid abuse
    });

    const result = await refreshAssets(assets);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Refresh prices (GET) error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const assets = await prisma.asset.findMany({
      where: {
        OR: [
          { watchlist_items: { some: {} } },
          { holdings: { some: {} } },
          { alerts: { some: { is_active: true } } },
        ],
      },
    });

    const result = await refreshAssets(assets);

    // Also check alerts after refreshing prices
    await checkAlerts().catch((e) => console.error("Alert check failed:", e));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Refresh prices (POST) error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

async function refreshAssets(
  assets: Array<{ id: string; symbol: string; category: string; source_provider: string }>
) {
  const grouped: Record<string, typeof assets> = {};
  for (const asset of assets) {
    const cat = asset.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(asset);
  }

  let updated = 0;
  const errors: string[] = [];

  for (const [category, categoryAssets] of Object.entries(grouped)) {
    const provider = getProviderForCategory(category);

    // Fetch individually with error isolation (batch call can fail entirely)
    for (const asset of categoryAssets) {
      try {
        const priceData = await provider.getPrice(asset.symbol);
        if (!priceData || priceData.price <= 0) {
          errors.push(`${asset.symbol}: no price`);
          continue;
        }

        const ttl = category === "METAL" ? 14400 : 300;
        await setCachedPrice(asset.symbol, { ...priceData, category }, ttl);

        // Update logo_url if provider returned one and we don't have it
        if (priceData.logo) {
          await prisma.asset
            .update({
              where: { id: asset.id },
              data: { logo_url: priceData.logo },
            })
            .catch(() => {});
        }

        // Update DB price cache
        await prisma.priceCache
          .upsert({
            where: { asset_id: asset.id },
            create: {
              asset_id: asset.id,
              price: priceData.price,
              currency: "USD",
              source_provider: asset.source_provider,
              fetched_at: new Date(),
            },
            update: {
              price: priceData.price,
              fetched_at: new Date(),
            },
          })
          .catch(() => {});

        updated++;
      } catch (e: any) {
        errors.push(`${asset.symbol}: ${e?.message || "error"}`);
      }
    }
  }

  return { success: true, updated, total: assets.length, errors: errors.slice(0, 5) };
}

async function checkAlerts() {
  const { getCachedPrice } = await import("@/lib/redis");
  const { sendAlertEmail } = await import("@/lib/email");

  const alerts = await prisma.alert.findMany({
    where: { is_active: true },
    include: { asset: true, user: true },
  });

  for (const alert of alerts) {
    if (alert.last_triggered_at) {
      const cooldownMs = alert.cooldown_minutes * 60 * 1000;
      if (Date.now() - alert.last_triggered_at.getTime() < cooldownMs) continue;
    }

    const cached = await getCachedPrice(alert.asset.symbol).catch(() => null);
    if (!cached) continue;
    const priceData = typeof cached === "string" ? JSON.parse(cached) : cached;
    const currentPrice = priceData.price;
    if (!currentPrice) continue;

    const target = Number(alert.target_price);
    let shouldTrigger = false;
    if (alert.condition_type === "ABOVE" && currentPrice >= target) shouldTrigger = true;
    if (alert.condition_type === "BELOW" && currentPrice <= target) shouldTrigger = true;

    if (shouldTrigger) {
      if (alert.email_enabled) {
        const recipient = alert.notify_email || alert.user.email;
        await sendAlertEmail(recipient, alert.asset.name, alert.asset.symbol, currentPrice, target, alert.condition_type).catch(() => {});
      }

      await prisma.alert.update({
        where: { id: alert.id },
        data: { last_triggered_at: new Date() },
      });

      await prisma.emailLog
        .create({
          data: {
            user_id: alert.user_id,
            email_type: "price_alert",
            subject: `Alert: ${alert.asset.symbol} ${alert.condition_type} $${target}`,
            status: "sent",
            sent_at: new Date(),
          },
        })
        .catch(() => {});
    }
  }
}
