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

export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "month";

  const now = new Date();
  let fromDate = new Date();
  switch (range) {
    case "week": fromDate.setDate(now.getDate() - 7); break;
    case "month": fromDate.setMonth(now.getMonth() - 1); break;
    case "year": fromDate.setFullYear(now.getFullYear() - 1); break;
    case "all": fromDate = new Date("2000-01-01"); break;
  }

  try {
    const entries = await prisma.journalEntry.findMany({
      where: { user_id: userId, entry_date: { gte: fromDate } },
      orderBy: { entry_date: "desc" },
    });

    // Calculate summary
    const amounts = entries.map((e) => Number(e.pnl_amount));
    const wins = amounts.filter((a) => a > 0);
    const losses = amounts.filter((a) => a < 0);

    let streak = 0;
    for (const a of amounts) {
      if (a > 0) streak++;
      else break;
    }

    const summary = {
      total_entries: entries.length,
      total_profit: wins.reduce((s, a) => s + a, 0),
      total_loss: losses.reduce((s, a) => s + a, 0),
      net_pnl: amounts.reduce((s, a) => s + a, 0),
      win_rate: entries.length > 0 ? (wins.length / entries.length) * 100 : 0,
      streak,
      best_day: entries.length > 0
        ? entries.reduce((best, e) => Number(e.pnl_amount) > Number(best.pnl_amount) ? e : best)
        : null,
      worst_day: entries.length > 0
        ? entries.reduce((worst, e) => Number(e.pnl_amount) < Number(worst.pnl_amount) ? e : worst)
        : null,
    };

    return NextResponse.json({ data: { entries, summary } });
  } catch (error) {
    console.error("Journal error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  try {
    const entry = await prisma.journalEntry.create({
      data: {
        user_id: userId,
        entry_date: new Date(body.entry_date),
        pnl_amount: body.pnl_amount,
        strategy_tag: body.strategy_tag,
        notes: body.notes,
      },
    });
    return NextResponse.json({ data: entry });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
