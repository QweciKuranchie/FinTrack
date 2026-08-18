import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);

    // Fetch accounts
    const accounts = await prisma.account.findMany({
      where: { householdId: household.id, isArchived: false },
      orderBy: { createdAt: "asc" },
    });

    // Calculate total accounts balance
    let totalAccountsBalance = new Decimal(0);
    accounts.forEach((acc) => {
      totalAccountsBalance = totalAccountsBalance.plus(acc.currentBalance.toString());
    });

    // Fetch assets & liabilities
    const assets = await prisma.asset.findMany({
      where: { householdId: household.id },
    });
    let totalAssets = new Decimal(0);
    assets.forEach((ast) => {
      totalAssets = totalAssets.plus(ast.currentValue.toString());
    });

    const liabilities = await prisma.liability.findMany({
      where: { householdId: household.id },
    });
    let totalLiabilities = new Decimal(0);
    liabilities.forEach((liab) => {
      totalLiabilities = totalLiabilities.plus(liab.currentBalance.toString());
    });

    // Net worth = accounts balance + assets - liabilities
    const netWorth = totalAccountsBalance.plus(totalAssets).minus(totalLiabilities);

    // Calculate this month's spending
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const monthTransactions = await prisma.transaction.findMany({
      where: {
        account: { householdId: household.id },
        type: "EXPENSE",
        date: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
    });

    let thisMonthSpend = new Decimal(0);
    monthTransactions.forEach((txn) => {
      thisMonthSpend = thisMonthSpend.plus(txn.amount.toString());
    });

    // Fetch upcoming subscriptions renewing in next 7 days
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);

    const upcomingSubscriptions = await prisma.subscription.findMany({
      where: {
        householdId: household.id,
        isActive: true,
        nextRenewalDate: {
          gte: now,
          lte: next7Days,
        },
      },
      orderBy: { nextRenewalDate: "asc" },
      take: 5,
    });

    return NextResponse.json({
      data: {
        netWorth: netWorth.toNumber(),
        totalAccountsBalance: totalAccountsBalance.toNumber(),
        totalAssets: totalAssets.toNumber(),
        totalLiabilities: totalLiabilities.toNumber(),
        thisMonthSpend: thisMonthSpend.toNumber(),
        accounts: accounts.map((acc) => ({
          ...acc,
          currentBalance: Number(acc.currentBalance),
        })),
        upcomingSubscriptions: upcomingSubscriptions.map((sub) => ({
          ...sub,
          amount: Number(sub.amount),
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard/summary error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch dashboard summary" } },
      { status: 500 }
    );
  }
}
