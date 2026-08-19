import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: "SUBSCRIPTION" | "BUDGET" | "DEBT" | "LIABILITY" | "SYSTEM";
  unread: boolean;
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const now = new Date();
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);

    // 1. Fetch Subscriptions Renewing Soon
    const upcomingSubscriptions = await prisma.subscription.findMany({
      where: {
        householdId: household.id,
        isActive: true,
        nextRenewalDate: { gte: now, lte: next7Days },
      },
      take: 5,
    });

    // 2. Fetch Debts Due Soon
    const upcomingDebts = await prisma.debtRecord.findMany({
      where: {
        householdId: household.id,
        dueDate: { gte: now, lte: next7Days },
      },
      take: 5,
    });

    // 3. Fetch Liabilities Due Soon
    const upcomingLiabilities = await prisma.liability.findMany({
      where: {
        householdId: household.id,
        dueDate: { gte: now, lte: next7Days },
      },
      take: 5,
    });

    // 4. Fetch Active Budgets for Month & Check Thresholds
    const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const budgets = await prisma.budget.findMany({
      where: {
        householdId: household.id,
        periodStart: { gte: firstDayMonth, lte: lastDayMonth },
      },
      include: { category: true },
    });

    const categoryIds = budgets.map((b) => b.categoryId);
    const monthTxns = categoryIds.length > 0
      ? await prisma.transaction.findMany({
          where: {
            account: { householdId: household.id },
            categoryId: { in: categoryIds },
            type: "EXPENSE",
            date: { gte: firstDayMonth, lte: lastDayMonth },
          },
        })
      : [];

    const spendingMap: Record<string, number> = {};
    monthTxns.forEach((t) => {
      if (t.categoryId) {
        spendingMap[t.categoryId] = (spendingMap[t.categoryId] || 0) + Number(t.amount);
      }
    });

    const notifications: NotificationItem[] = [];

    // Map Upcoming Subscriptions
    upcomingSubscriptions.forEach((sub) => {
      notifications.push({
        id: `sub-${sub.id}`,
        title: "Subscription Renewal Due Soon",
        desc: `${sub.name} renews on ${new Date(sub.nextRenewalDate).toLocaleDateString()} (${sub.currency} ${Number(sub.amount).toFixed(2)})`,
        time: "Upcoming",
        type: "SUBSCRIPTION",
        unread: true,
      });
    });

    // Map Upcoming Debts
    upcomingDebts.forEach((d) => {
      notifications.push({
        id: `debt-${d.id}`,
        title: d.isReceivable ? "Receivable Due Date" : "Personal Debt Due Date",
        desc: `${d.title} (${d.counterparty}) is due on ${d.dueDate ? new Date(d.dueDate).toLocaleDateString() : "soon"} (${d.currency} ${Number(d.currentBalance).toFixed(2)})`,
        time: "Due Soon",
        type: "DEBT",
        unread: true,
      });
    });

    // Map Upcoming Liabilities
    upcomingLiabilities.forEach((l) => {
      notifications.push({
        id: `liab-${l.id}`,
        title: "Liability Loan Due Notice",
        desc: `${l.name} (${l.counterparty || "Bank"}) payment due on ${l.dueDate ? new Date(l.dueDate).toLocaleDateString() : "soon"}`,
        time: "Notice",
        type: "LIABILITY",
        unread: true,
      });
    });

    // Map Over-Budget Warnings
    budgets.forEach((b) => {
      const spent = spendingMap[b.categoryId] || 0;
      const limit = Number(b.amount);
      if (limit > 0) {
        const pct = Math.round((spent / limit) * 100);
        if (pct >= 80) {
          notifications.push({
            id: `budg-${b.id}`,
            title: pct >= 100 ? "Budget Limit Exceeded" : "Budget Threshold Warning",
            desc: `${b.category?.name || "Category"} spending has reached ${pct}% of monthly allowance (${b.currency} ${spent.toFixed(2)} / ${limit.toFixed(2)})`,
            time: "Alert",
            type: "BUDGET",
            unread: true,
          });
        }
      }
    });

    // System Fallback Notifications if list is empty
    if (notifications.length === 0) {
      notifications.push({
        id: "sys-1",
        title: "All Financial Systems Operational",
        desc: "Live FX rates, security protection, and database synchronization active.",
        time: "System",
        type: "SYSTEM",
        unread: false,
      });
    }

    return NextResponse.json({ data: notifications, unreadCount: notifications.filter((n) => n.unread).length });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch notifications" } },
      { status: 500 }
    );
  }
}
