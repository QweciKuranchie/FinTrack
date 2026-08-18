import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCachedFxRates, convertCurrency } from "@/lib/fx";
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

    // Fetch FX rates map for cross-currency conversion
    const fxRates = await getCachedFxRates();

    // Fetch accounts
    const accounts = await prisma.account.findMany({
      where: { householdId: household.id, isArchived: false },
      orderBy: { createdAt: "asc" },
    });

    // Calculate total accounts balance in GHS
    let totalAccountsBalanceGhs = new Decimal(0);
    accounts.forEach((acc) => {
      const ghsValue = convertCurrency(acc.currentBalance.toString(), acc.currency, "GHS", fxRates);
      totalAccountsBalanceGhs = totalAccountsBalanceGhs.plus(ghsValue);
    });

    // Fetch assets & convert to GHS
    const assets = await prisma.asset.findMany({
      where: { householdId: household.id },
    });
    let totalAssetsGhs = new Decimal(0);
    assets.forEach((ast) => {
      const ghsValue = convertCurrency(ast.currentValue.toString(), ast.currency, "GHS", fxRates);
      totalAssetsGhs = totalAssetsGhs.plus(ghsValue);
    });

    // Fetch liabilities & convert to GHS
    const liabilities = await prisma.liability.findMany({
      where: { householdId: household.id },
    });
    let totalLiabilitiesGhs = new Decimal(0);
    liabilities.forEach((liab) => {
      const ghsValue = convertCurrency(liab.currentBalance.toString(), liab.currency, "GHS", fxRates);
      totalLiabilitiesGhs = totalLiabilitiesGhs.plus(ghsValue);
    });

    // Net worth (GHS) = accounts balance + assets - liabilities
    const netWorthGhs = totalAccountsBalanceGhs.plus(totalAssetsGhs).minus(totalLiabilitiesGhs);

    // Calculate this month's spending in GHS
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

    let thisMonthSpendGhs = new Decimal(0);
    monthTransactions.forEach((txn) => {
      const ghsValue = convertCurrency(txn.amount.toString(), txn.currency, "GHS", fxRates);
      thisMonthSpendGhs = thisMonthSpendGhs.plus(ghsValue);
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
        netWorth: netWorthGhs.toNumber(),
        totalAccountsBalance: totalAccountsBalanceGhs.toNumber(),
        totalAssets: totalAssetsGhs.toNumber(),
        totalLiabilities: totalLiabilitiesGhs.toNumber(),
        thisMonthSpend: thisMonthSpendGhs.toNumber(),
        accounts: accounts.map((acc) => ({
          ...acc,
          currentBalance: Number(acc.currentBalance),
          ghsEquivalent: convertCurrency(acc.currentBalance.toString(), acc.currency, "GHS", fxRates).toNumber(),
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
