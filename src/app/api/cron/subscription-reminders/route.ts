import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get("authorization");
    const secret = searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      const isAuthorized =
        secret === cronSecret || authHeader === `Bearer ${cronSecret}`;
      if (!isAuthorized) {
        return NextResponse.json({ error: { message: "Unauthorized cron request" } }, { status: 401 });
      }
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    const now = new Date();

    // Fetch active subscriptions
    const activeSubscriptions = await prisma.subscription.findMany({
      where: { isActive: true },
      include: {
        household: {
          include: {
            members: true,
          },
        },
      },
    });

    const upcomingAlerts: Array<{ subscriptionName: string; daysLeft: number; amount: string }> = [];

    for (const sub of activeSubscriptions) {
      const renewalDate = new Date(sub.nextRenewalDate);
      const diffMs = renewalDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= sub.reminderDaysBefore) {
        upcomingAlerts.push({
          subscriptionName: sub.name,
          daysLeft: diffDays,
          amount: `${sub.currency} ${Number(sub.amount).toFixed(2)}`,
        });

        // Send email via Resend if API key is configured
        if (resend) {
          try {
            await resend.emails.send({
              from: "FinTrack Reminders <onboarding@resend.dev>",
              to: "owner@fintrack.app", // Fallback or member email
              subject: `Subscription Renewal Reminder: ${sub.name}`,
              html: `
                <div style="font-family: sans-serif; padding: 20px;">
                  <h2>FinTrack Subscription Renewal Alert</h2>
                  <p>Your subscription for <strong>${sub.name}</strong> is renewing in <strong>${diffDays} day(s)</strong> on ${renewalDate.toLocaleDateString()}.</p>
                  <p><strong>Renewal Amount:</strong> ${sub.currency} ${Number(sub.amount).toFixed(2)}</p>
                  <p>Billing Cycle: ${sub.billingCycle}</p>
                </div>
              `,
            });
          } catch (resendErr) {
            console.error(`Failed to send email for ${sub.name}:`, resendErr);
          }
        }
      }
    }

    return NextResponse.json({
      data: {
        success: true,
        checkedSubscriptions: activeSubscriptions.length,
        triggeredAlertsCount: upcomingAlerts.length,
        alerts: upcomingAlerts,
      },
    });
  } catch (error) {
    console.error("GET /api/cron/subscription-reminders error:", error);
    return NextResponse.json(
      { error: { message: "Failed to process subscription reminders" } },
      { status: 500 }
    );
  }
}
