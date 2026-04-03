import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY || "");
}
const FROM = process.env.EMAIL_FROM || "TrackMint <onboarding@resend.dev>";

export async function sendAlertEmail(
  to: string,
  assetName: string,
  symbol: string,
  currentPrice: number,
  targetPrice: number,
  condition: "ABOVE" | "BELOW"
) {
  const direction = condition === "ABOVE" ? "risen above" : "fallen below";
  const subject = `🔔 Price Alert: ${symbol} has ${direction} $${targetPrice.toFixed(2)}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; background: #0f1117; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #3b82f6, #00d68f); padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; color: white;">TrackMint Alert</h1>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #e2e8f0; margin-top: 0;">${assetName} (${symbol})</h2>
        <div style="background: #1a1d29; border-radius: 8px; padding: 20px; margin: 16px 0;">
          <p style="margin: 0; color: #94a3b8; font-size: 14px;">Current Price</p>
          <p style="margin: 4px 0 0; font-size: 28px; font-weight: bold; color: ${condition === "ABOVE" ? "#00d68f" : "#ff6b6b"};">$${currentPrice.toFixed(2)}</p>
        </div>
        <p style="color: #94a3b8;">Your target of <strong style="color: #e2e8f0;">$${targetPrice.toFixed(2)}</strong> has been ${direction === "risen above" ? "exceeded" : "breached"}.</p>
        <p style="color: #64748b; font-size: 12px; margin-top: 24px;">This is an automated alert from TrackMint. Not financial advice.</p>
      </div>
    </div>
  `;

  try {
    await getResend().emails.send({ from: FROM, to, subject, html });
    console.log(`Alert email sent to ${to} for ${symbol}`);
    return true;
  } catch (e) {
    console.error("Failed to send alert email:", e);
    return false;
  }
}

export async function sendDigestEmail(to: string, subject: string, html: string) {
  try {
    await getResend().emails.send({ from: FROM, to, subject, html });
    console.log(`Digest email sent to ${to}`);
    return true;
  } catch (e) {
    console.error("Failed to send digest email:", e);
    return false;
  }
}
