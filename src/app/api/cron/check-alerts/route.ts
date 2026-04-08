import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCachedPrice } from "@/lib/redis";
import { sendAlertEmail } from "@/lib/email";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const alerts = await prisma.alert.findMany({
      where: { is_active: true },
      include: { asset: true, user: true },
    });

    let triggered = 0;

    for (const alert of alerts) {
      // Check cooldown
      if (alert.last_triggered_at) {
        const cooldownMs = alert.cooldown_minutes * 60 * 1000;
        if (Date.now() - alert.last_triggered_at.getTime() < cooldownMs) continue;
      }

      // Get current price
      const cached = await getCachedPrice(alert.asset.symbol).catch(() => null);
      if (!cached) continue;
      const priceData = typeof cached === "string" ? JSON.parse(cached) : cached;
      const currentPrice = priceData.price;
      if (!currentPrice) continue;

      const target = Number(alert.target_price);
      let shouldTrigger = false;

      if (alert.condition_type === "ABOVE" && currentPrice >= target) shouldTrigger = true;
      if (alert.condition_type === "BELOW" && currentPrice <= target) shouldTrigger = true;

      if (shouldTrigger) {
        // Send email (only if enabled)
        if (alert.email_enabled) {
          const recipient = alert.notify_email || alert.user.email;
          await sendAlertEmail(
            recipient,
            alert.asset.name,
            alert.asset.symbol,
            currentPrice,
            target,
            alert.condition_type
          );
        }

        // Update last triggered
        await prisma.alert.update({
          where: { id: alert.id },
          data: { last_triggered_at: new Date() },
        });

        // Log email
        await prisma.emailLog.create({
          data: {
            user_id: alert.user_id,
            email_type: "price_alert",
            subject: `Alert: ${alert.asset.symbol} ${alert.condition_type} $${target}`,
            status: "sent",
            sent_at: new Date(),
          },
        });

        triggered++;
      }
    }

    return NextResponse.json({ success: true, checked: alerts.length, triggered });
  } catch (error) {
    console.error("Check alerts error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
