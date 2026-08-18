import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const params = context?.params ? await Promise.resolve(context.params) : { id: "" };
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: { message: "Transaction ID is required" } }, { status: 400 });
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        account: { householdId: household.id },
      },
      include: { account: true, category: true },
    });

    if (!transaction) {
      return NextResponse.json({ error: { message: "Transaction not found" } }, { status: 404 });
    }

    return NextResponse.json({ data: transaction });
  } catch (error) {
    console.error("GET /api/transactions/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch transaction" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const params = context?.params ? await Promise.resolve(context.params) : { id: "" };
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: { message: "Transaction ID is required" } }, { status: 400 });
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);

    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        account: { householdId: household.id },
      },
      include: { account: true },
    });

    if (!transaction) {
      return NextResponse.json({ error: { message: "Transaction not found" } }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Revert account balance adjustment
      const isExpenseOrTransfer = transaction.type === "EXPENSE" || transaction.type === "TRANSFER";
      const balanceChange = isExpenseOrTransfer ? transaction.amount : transaction.amount.negated();

      await tx.account.update({
        where: { id: transaction.accountId },
        data: {
          currentBalance: { increment: balanceChange },
        },
      });

      await tx.transaction.delete({
        where: { id },
      });
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("DELETE /api/transactions/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to delete transaction" } },
      { status: 500 }
    );
  }
}
