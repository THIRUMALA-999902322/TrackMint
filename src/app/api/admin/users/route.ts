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
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            holdings: true,
            watchlists: true,
            alerts: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const data = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      created_at: u.created_at,
      is_admin: u.is_admin,
      holding_count: u._count.holdings,
      watchlist_count: u._count.watchlists,
      alert_count: u._count.alerts,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
