import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transactionSchema } from "@/lib/validation/finance";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const categoryId = searchParams.get("categoryId");
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const household = await getOrCreateHouseholdForUser(user.id, user.email);

    // Build filter
    const where: Prisma.TransactionWhereInput = {
      account: {
        householdId: household.id,
      },
    };

    if (accountId) where.accountId = accountId;
    if (categoryId) where.categoryId = categoryId;
    if (type) where.type = type as Prisma.EnumTxnTypeFilter;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        account: { select: { id: true, name: true, currency: true, type: true } },
        category: { select: { id: true, name: true, icon: true, color: true } },
      },
    });

    return NextResponse.json({ data: transactions });
  } catch (error) {
    console.error("GET /api/transactions error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch transactions" } },
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
    const validation = transactionSchema.safeParse(json);
    if (!validation.success) {
      return NextResponse.json(
        { error: { message: "Validation error", details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const { accountId, categoryId, amount, currency, type, description, date, transferAccountId } =
      validation.data;

    // Verify account belongs to household
    const account = await prisma.account.findFirst({
      where: { id: accountId, householdId: household.id },
    });

    if (!account) {
      return NextResponse.json({ error: { message: "Account not found" } }, { status: 404 });
    }

    let transferAccount = null;
    if (type === "TRANSFER" && transferAccountId) {
      transferAccount = await prisma.account.findFirst({
        where: { id: transferAccountId, householdId: household.id },
      });
      if (!transferAccount) {
        return NextResponse.json(
          { error: { message: "Transfer target account not found" } },
          { status: 404 }
        );
      }
    }

    const decimalAmount = new Prisma.Decimal(amount);

    // Compute balance update in DB transaction
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          accountId,
          categoryId: categoryId || null,
          amount: decimalAmount,
          currency,
          type,
          description,
          date: new Date(date),
          transferAccountId: transferAccountId || null,
        },
        include: {
          account: true,
          category: true,
        },
      });

      // Update primary account balance
      if (type === "EXPENSE") {
        await tx.account.update({
          where: { id: accountId },
          data: { currentBalance: { decrement: decimalAmount } },
        });
      } else if (type === "INCOME") {
        await tx.account.update({
          where: { id: accountId },
          data: { currentBalance: { increment: decimalAmount } },
        });
      } else if (type === "TRANSFER") {
        await tx.account.update({
          where: { id: accountId },
          data: { currentBalance: { decrement: decimalAmount } },
        });
        if (transferAccountId) {
          await tx.account.update({
            where: { id: transferAccountId },
            data: { currentBalance: { increment: decimalAmount } },
          });
        }
      }

      return transaction;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error("POST /api/transactions error:", error);
    return NextResponse.json(
      { error: { message: "Failed to create transaction" } },
      { status: 500 }
    );
  }
}
