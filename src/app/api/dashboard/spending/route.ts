import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCachedFxRates, convertCurrency, type DecimalType } from "@/lib/fx";
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

    // Fetch expense transactions for past 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const transactions = await prisma.transaction.findMany({
      where: {
        account: { householdId: household.id },
        type: "EXPENSE",
        date: { gte: sixMonthsAgo },
      },
      include: {
        category: true,
      },
      orderBy: { date: "asc" },
    });

    // Spend by category
    const categorySpendMap: Record<string, { name: string; amount: DecimalType; color: string }> = {};
    // Monthly trend
    const monthlySpendMap: Record<string, DecimalType> = {};

    transactions.forEach((txn) => {
      const ghsAmount = convertCurrency(txn.amount.toString(), txn.currency, "GHS", fxRates);
      const catName = txn.category?.name || "Uncategorized";
      const catColor = txn.category?.color || "#0F766E";

      if (!categorySpendMap[catName]) {
        categorySpendMap[catName] = { name: catName, amount: new Decimal(0), color: catColor };
      }
      categorySpendMap[catName].amount = categorySpendMap[catName].amount.plus(ghsAmount);

      const monthLabel = txn.date.toLocaleString("default", { month: "short", year: "2-digit" });
      monthlySpendMap[monthLabel] = (monthlySpendMap[monthLabel] || new Decimal(0)).plus(ghsAmount);
    });

    const byCategory = Object.values(categorySpendMap).map((c) => ({
      name: c.name,
      amount: c.amount.toNumber(),
      color: c.color,
    }));

    const monthlyTrend = Object.entries(monthlySpendMap).map(([month, amount]) => ({
      month,
      amount: amount.toNumber(),
    }));

    // Net worth trend snapshots
    const snapshots = await prisma.netWorthSnapshot.findMany({
      where: { householdId: household.id },
      orderBy: { date: "asc" },
      take: 30,
    });

    const netWorthTrend = snapshots.map((s) => ({
      date: new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      netWorth: Number(s.netWorth),
    }));

    return NextResponse.json({
      data: {
        byCategory,
        monthlyTrend,
        netWorthTrend,
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard/spending error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch spending analytics" } },
      { status: 500 }
    );
  }
}
