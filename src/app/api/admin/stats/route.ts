import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getAdminUser() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
  });
  if (!dbUser || !dbUser.is_admin) return null;
  return dbUser;
}

export async function GET() {
  const admin = await getAdminUser();
  if (!admin)
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [totalUsers, totalHoldings, totalAssets, totalAlerts, newUsersLast7Days] =
      await Promise.all([
        prisma.user.count(),
        prisma.holding.count(),
        prisma.asset.count(),
        prisma.alert.count({ where: { is_active: true } }),
        prisma.user.count({ where: { created_at: { gte: sevenDaysAgo } } }),
      ]);

    return NextResponse.json({
      data: {
        total_users: totalUsers,
        total_holdings: totalHoldings,
        total_assets: totalAssets,
        total_alerts: totalAlerts,
        new_users_last_7_days: newUsersLast7Days,
      },
    });
  } catch (error) {
    console.error("Admin stats GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
