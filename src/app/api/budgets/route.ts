import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { budgetSchema } from "@/lib/validation/subscription-budget";
import { getCachedFxRates, convertCurrency, type DecimalType } from "@/lib/fx";
import { Prisma } from "@prisma/client";
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

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Fetch budgets for this month
    const budgets = await prisma.budget.findMany({
      where: {
        householdId: household.id,
        periodStart: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
      include: {
        category: true,
      },
    });

    // Fetch month transactions for spending calculation
    const monthTxns = await prisma.transaction.findMany({
      where: {
        account: { householdId: household.id },
        type: "EXPENSE",
        date: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
    });

    // Group spending by categoryId (converted to GHS)
    const categorySpendMap: Record<string, DecimalType> = {};
    monthTxns.forEach((txn) => {
      if (!txn.categoryId) return;
      const ghsAmount = convertCurrency(txn.amount.toString(), txn.currency, "GHS", fxRates);
      categorySpendMap[txn.categoryId] = (categorySpendMap[txn.categoryId] || new Decimal(0)).plus(ghsAmount);
    });

    const budgetSummary = budgets.map((b) => {
      const spentGhs = categorySpendMap[b.categoryId] || new Decimal(0);
      const budgetGhs = Number(b.amount);
      const spentNumber = spentGhs.toNumber();
      const percent = budgetGhs > 0 ? Math.round((spentNumber / budgetGhs) * 100) : 0;

      return {
        id: b.id,
        categoryId: b.categoryId,
        categoryName: b.category.name,
        categoryIcon: b.category.icon,
        categoryColor: b.category.color,
        budgetAmount: budgetGhs,
        spentAmount: spentNumber,
        percentage: percent,
        currency: b.currency,
      };
    });

    return NextResponse.json({ data: budgetSummary });
  } catch (error) {
    console.error("GET /api/budgets error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch budgets" } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const json = await request.json();
    const validation = budgetSchema.safeParse(json);
    if (!validation.success) {
      return NextResponse.json(
        { error: { message: "Validation error", details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const { categoryId, amount, currency, periodStart } = validation.data;

    const now = new Date();
    const firstDayOfMonth = periodStart ? new Date(periodStart) : new Date(now.getFullYear(), now.getMonth(), 1);

    const budget = await prisma.budget.upsert({
      where: {
        householdId_categoryId_periodStart: {
          householdId: household.id,
          categoryId,
          periodStart: firstDayOfMonth,
        },
      },
      update: {
        amount: new Prisma.Decimal(amount),
        currency,
      },
      create: {
        householdId: household.id,
        categoryId,
        amount: new Prisma.Decimal(amount),
        currency,
        periodStart: firstDayOfMonth,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ data: budget }, { status: 201 });
  } catch (error) {
    console.error("POST /api/budgets error:", error);
    return NextResponse.json(
      { error: { message: "Failed to set budget" } },
      { status: 500 }
    );
  }
}
