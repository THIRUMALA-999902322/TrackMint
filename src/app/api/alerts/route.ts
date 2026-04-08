import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getUserId() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  let dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: { email: user.email!, name: user.user_metadata?.name },
    });
  }
  return dbUser.id;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const alerts = await prisma.alert.findMany({
      where: { user_id: userId },
      include: { asset: true },
      orderBy: { created_at: "desc" },
    });

    const enriched = alerts.map((a) => ({
      id: a.id,
      symbol: a.asset.symbol,
      name: a.asset.name,
      category: a.asset.category,
      condition_type: a.condition_type,
      target_price: a.target_price,
      is_active: a.is_active,
      cooldown_minutes: a.cooldown_minutes,
      last_triggered_at: a.last_triggered_at,
      notify_email: a.notify_email,
      email_enabled: a.email_enabled,
      created_at: a.created_at,
    }));

    return NextResponse.json({ data: enriched });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  try {
    let asset = await prisma.asset.findFirst({
      where: { symbol: body.symbol.toUpperCase(), category: body.category },
    });

    if (!asset) {
      asset = await prisma.asset.create({
        data: {
          symbol: body.symbol.toUpperCase(),
          name: body.name || body.symbol,
          category: body.category,
          source_provider: body.category === "STOCK" ? "finnhub" : body.category === "CRYPTO" ? "coingecko" : "goldapi",
        },
      });
    }

    const alert = await prisma.alert.create({
      data: {
        user_id: userId,
        asset_id: asset.id,
        condition_type: body.condition_type,
        target_price: body.target_price,
        cooldown_minutes: body.cooldown_minutes || 60,
        notify_email: body.notify_email || null,
        email_enabled: body.email_enabled !== undefined ? body.email_enabled : true,
      },
    });

    return NextResponse.json({ data: alert });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create alert" }, { status: 500 });
  }
}
