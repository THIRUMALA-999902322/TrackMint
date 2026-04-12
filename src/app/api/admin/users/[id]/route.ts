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

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser();
  if (!admin)
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = params;

  // Safety: cannot delete yourself
  if (id === admin.id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  try {
    // Check user exists
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Cascade delete is configured in schema, so deleting user removes all related data
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin user DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
