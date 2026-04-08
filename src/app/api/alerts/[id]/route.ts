import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getDbUserId() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
  return dbUser?.id || null;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const userId = await getDbUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  try {
    const existing = await prisma.alert.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data: any = {};
    if (body.target_price !== undefined) data.target_price = body.target_price;
    if (body.condition_type !== undefined) data.condition_type = body.condition_type;
    if (body.is_active !== undefined) data.is_active = body.is_active;
    if (body.active !== undefined) data.is_active = body.active;
    if (body.email_enabled !== undefined) data.email_enabled = body.email_enabled;
    if (body.notify_email !== undefined) {
      const val = body.notify_email;
      if (val === null || val === "") {
        data.notify_email = null;
      } else if (typeof val === "string" && isValidEmail(val)) {
        data.notify_email = val;
      } else {
        return NextResponse.json({ error: "Invalid email" }, { status: 400 });
      }
    }

    const alert = await prisma.alert.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json({ data: alert });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const userId = await getDbUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const existing = await prisma.alert.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await prisma.alert.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
