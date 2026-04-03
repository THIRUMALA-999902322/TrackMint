import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCachedPrice } from "@/lib/redis";
import { sendDigestEmail } from "@/lib/email";
import { format } from "date-fns";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find users with digest enabled
    const users = await prisma.user.findMany({
      where: { digest_enabled: true },
      include: {
        holdings: { include: { asset: true } },
        alerts: { where: { last_triggered_at: { gte: new Date(Date.now() - 86400000) } }, include: { asset: true } },
      },
    });

    let sent = 0;

    for (const user of users) {
      // Build portfolio summary
      let totalValue = 0;
      let totalCost = 0;
      const holdingRows: string[] = [];

      for (const h of user.holdings) {
        const qty = Number(h.quantity);
        const buyPrice = Number(h.avg_buy_price);
        let currentPrice = buyPrice;

        const cached = await getCachedPrice(h.asset.symbol).catch(() => null);
        if (cached) {
          const p = typeof cached === "string" ? JSON.parse(cached) : cached;
          currentPrice = p.price || buyPrice;
        }

        const value = currentPrice * qty;
        const cost = buyPrice * qty;
        const pl = value - cost;
        const plPct = cost > 0 ? ((pl / cost) * 100).toFixed(2) : "0.00";
        const plColor = pl >= 0 ? "#00d68f" : "#ff6b6b";

        totalValue += value;
        totalCost += cost;

        holdingRows.push(`
          <tr>
            <td style="padding: 8px; color: #e2e8f0;">${h.asset.symbol}</td>
            <td style="padding: 8px; color: #94a3b8;">$${currentPrice.toFixed(2)}</td>
            <td style="padding: 8px; color: ${plColor};">$${pl.toFixed(2)} (${plPct}%)</td>
          </tr>
        `);
      }

      const totalPL = totalValue - totalCost;
      const totalPLPct = totalCost > 0 ? ((totalPL / totalCost) * 100).toFixed(2) : "0.00";
      const plColor = totalPL >= 0 ? "#00d68f" : "#ff6b6b";

      // Triggered alerts
      const alertRows = user.alerts.map((a) =>
        `<li style="color: #94a3b8;">${a.asset.symbol}: ${a.condition_type} $${Number(a.target_price).toFixed(2)}</li>`
      ).join("");

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f1117; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #3b82f6, #00d68f); padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; color: white;">TrackMint Daily Digest</h1>
            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">${format(new Date(), "MMMM d, yyyy")}</p>
          </div>
          <div style="padding: 24px;">
            <div style="background: #1a1d29; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">Portfolio Value</p>
              <p style="margin: 4px 0; font-size: 28px; font-weight: bold; color: #e2e8f0;">$${totalValue.toFixed(2)}</p>
              <p style="margin: 0; color: ${plColor}; font-size: 14px;">$${totalPL.toFixed(2)} (${totalPLPct}%) total P/L</p>
            </div>
            ${holdingRows.length > 0 ? `
              <h3 style="color: #e2e8f0; margin-bottom: 8px;">Holdings</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead><tr style="border-bottom: 1px solid #2a2d3a;">
                  <th style="padding: 8px; text-align: left; color: #94a3b8; font-size: 12px;">Asset</th>
                  <th style="padding: 8px; text-align: left; color: #94a3b8; font-size: 12px;">Price</th>
                  <th style="padding: 8px; text-align: left; color: #94a3b8; font-size: 12px;">P/L</th>
                </tr></thead>
                <tbody>${holdingRows.join("")}</tbody>
              </table>
            ` : ""}
            ${alertRows ? `
              <h3 style="color: #e2e8f0; margin-top: 20px; margin-bottom: 8px;">Triggered Alerts (24h)</h3>
              <ul style="padding-left: 20px;">${alertRows}</ul>
            ` : ""}
            <p style="color: #64748b; font-size: 11px; margin-top: 24px; text-align: center;">
              TrackMint - For informational purposes only. Not financial advice.
            </p>
          </div>
        </div>
      `;

      const success = await sendDigestEmail(user.email, `TrackMint Daily Digest - ${format(new Date(), "MMM d")}`, html);
      if (success) sent++;
    }

    return NextResponse.json({ success: true, sent, total: users.length });
  } catch (error) {
    console.error("Send digests error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
