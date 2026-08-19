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
    const fxRates = await getCachedFxRates();

    // 1. Fetch Accounts & Balances
    const accounts = await prisma.account.findMany({
      where: { householdId: household.id, isArchived: false },
      orderBy: { createdAt: "asc" },
    });

    let totalAccountsBalanceGhs = new Decimal(0);
    accounts.forEach((acc) => {
      const ghsValue = convertCurrency(acc.currentBalance.toString(), acc.currency, "GHS", fxRates);
      totalAccountsBalanceGhs = totalAccountsBalanceGhs.plus(ghsValue);
    });

    // 2. Fetch Assets & Liabilities
    const [assets, liabilities, savingsGoals] = await Promise.all([
      prisma.asset.findMany({ where: { householdId: household.id } }),
      prisma.liability.findMany({ where: { householdId: household.id } }),
      prisma.savingsGoal.findMany({ where: { householdId: household.id } }),
    ]);

    let totalAssetsGhs = new Decimal(0);
    assets.forEach((ast) => {
      totalAssetsGhs = totalAssetsGhs.plus(convertCurrency(ast.currentValue.toString(), ast.currency, "GHS", fxRates));
    });

    let totalLiabilitiesGhs = new Decimal(0);
    liabilities.forEach((liab) => {
      totalLiabilitiesGhs = totalLiabilitiesGhs.plus(convertCurrency(liab.currentBalance.toString(), liab.currency, "GHS", fxRates));
    });

    let totalSavedGhs = new Decimal(0);
    let totalTargetGhs = new Decimal(0);
    savingsGoals.forEach((g) => {
      totalSavedGhs = totalSavedGhs.plus(convertCurrency(g.currentAmount.toString(), g.currency, "GHS", fxRates));
      totalTargetGhs = totalTargetGhs.plus(convertCurrency(g.targetAmount.toString(), g.currency, "GHS", fxRates));
    });

    const netWorthGhs = totalAccountsBalanceGhs.plus(totalAssetsGhs).minus(totalLiabilitiesGhs);
    const savingsProgressPct = totalTargetGhs.gt(0) ? Math.min(100, Math.round(totalSavedGhs.div(totalTargetGhs).times(100).toNumber())) : 0;

    // 3. Transactions Calculations (Current Month vs Last Month)
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [thisMonthTxns, lastMonthTxns] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          account: { householdId: household.id },
          date: { gte: firstDayThisMonth, lte: lastDayThisMonth },
        },
      }),
      prisma.transaction.findMany({
        where: {
          account: { householdId: household.id },
          date: { gte: firstDayLastMonth, lte: lastDayLastMonth },
        },
      }),
    ]);

    let thisMonthIncome = new Decimal(0);
    let thisMonthExpense = new Decimal(0);
    thisMonthTxns.forEach((t) => {
      const val = convertCurrency(t.amount.toString(), t.currency, "GHS", fxRates);
      if (t.type === "INCOME") thisMonthIncome = thisMonthIncome.plus(val);
      if (t.type === "EXPENSE") thisMonthExpense = thisMonthExpense.plus(val);
    });

    let lastMonthIncome = new Decimal(0);
    let lastMonthExpense = new Decimal(0);
    lastMonthTxns.forEach((t) => {
      const val = convertCurrency(t.amount.toString(), t.currency, "GHS", fxRates);
      if (t.type === "INCOME") lastMonthIncome = lastMonthIncome.plus(val);
      if (t.type === "EXPENSE") lastMonthExpense = lastMonthExpense.plus(val);
    });

    const incomeChangePct = lastMonthIncome.gt(0)
      ? Math.round(thisMonthIncome.minus(lastMonthIncome).div(lastMonthIncome).times(100).toNumber())
      : thisMonthIncome.gt(0) ? 100 : 0;

    const expenseChangePct = lastMonthExpense.gt(0)
      ? Math.round(thisMonthExpense.minus(lastMonthExpense).div(lastMonthExpense).times(100).toNumber())
      : thisMonthExpense.gt(0) ? 100 : 0;

    // Upcoming Subscriptions
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);

    const upcomingSubscriptions = await prisma.subscription.findMany({
      where: {
        householdId: household.id,
        isActive: true,
        nextRenewalDate: { gte: now, lte: next7Days },
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
        thisMonthIncome: thisMonthIncome.toNumber(),
        thisMonthSpend: thisMonthExpense.toNumber(),
        totalSavings: totalSavedGhs.toNumber(),
        savingsProgressPct,
        incomeChangePct,
        expenseChangePct,
        balanceChangePct: 3.2,
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
