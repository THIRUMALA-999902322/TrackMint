import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser) {
    return NextResponse.json({ data: { name: "", timezone: "UTC", base_currency: "USD", digest_time: "07:00", digest_enabled: true } });
  }

  return NextResponse.json({
    data: {
      name: dbUser.name || "",
      timezone: dbUser.timezone,
      base_currency: dbUser.base_currency,
      digest_time: dbUser.digest_time,
      digest_enabled: dbUser.digest_enabled,
    },
  });
}

export async function PATCH(request: Request) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  try {
    const updated = await prisma.user.upsert({
      where: { email: user.email! },
      update: {
        name: body.name,
        timezone: body.timezone,
        base_currency: body.base_currency,
        digest_time: body.digest_time,
        digest_enabled: body.digest_enabled,
      },
      create: {
        email: user.email!,
        name: body.name,
        timezone: body.timezone || "UTC",
        base_currency: body.base_currency || "USD",
        digest_time: body.digest_time || "07:00",
        digest_enabled: body.digest_enabled ?? true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
