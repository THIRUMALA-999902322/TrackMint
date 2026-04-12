import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/shared/sidebar";
import { PriceRefreshProvider } from "@/components/price-refresh-provider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user?.email) {
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { is_admin: true },
    }).catch(() => null);
    isAdmin = dbUser?.is_admin ?? false;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userEmail={user?.email} isAdmin={isAdmin} />
      <main className="lg:ml-64 pt-14 lg:pt-0 pb-20 lg:pb-0">
        <PriceRefreshProvider>
          <div className="p-4 lg:p-8 max-w-7xl mx-auto">{children}</div>
        </PriceRefreshProvider>
      </main>
    </div>
  );
}
