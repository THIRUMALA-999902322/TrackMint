import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendAlertEmail } from "@/lib/email";

export async function POST() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const success = await sendAlertEmail(
    user.email,
    "Bitcoin",
    "BTC",
    68500.00,
    65000.00,
    "ABOVE"
  );

  return NextResponse.json({
    success,
    message: success
      ? `Test alert email sent to ${user.email}`
      : "Failed to send test email. Check Resend API key and email configuration.",
  });
}
