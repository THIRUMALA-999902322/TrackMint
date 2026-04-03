import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendDigestEmail } from "@/lib/email";

export async function POST() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f1117; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #3b82f6, #00d68f); padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; color: white;">TrackMint Daily Digest</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">Test Email</p>
      </div>
      <div style="padding: 32px;">
        <p style="color: #e2e8f0;">This is a test email from your TrackMint daily digest.</p>
        <p style="color: #94a3b8;">When configured, you'll receive:</p>
        <ul style="color: #94a3b8; padding-left: 20px;">
          <li>Portfolio snapshot with total value and P/L</li>
          <li>Top gainers and losers in your holdings</li>
          <li>Triggered price alerts from the last 24 hours</li>
          <li>Market news highlights for your watched assets</li>
          <li>Day/week/month P/L summary from your journal</li>
        </ul>
        <div style="background: #1a1d29; border-radius: 8px; padding: 16px; margin-top: 20px;">
          <p style="margin: 0; color: #94a3b8; font-size: 12px;">Portfolio Value</p>
          <p style="margin: 4px 0; font-size: 24px; font-weight: bold; color: #00d68f;">$12,345.67</p>
          <p style="margin: 0; color: #00d68f; font-size: 14px;">+$234.56 (+1.94%) today</p>
        </div>
        <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
          TrackMint - For informational purposes only. Not financial advice.
        </p>
      </div>
    </div>
  `;

  const success = await sendDigestEmail(user.email, "TrackMint Daily Digest (Test)", html);

  return NextResponse.json({ success });
}
