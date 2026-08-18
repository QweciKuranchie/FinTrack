import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function DELETE(request: Request, props: RouteContext) {
  try {
    const params = await props.params;
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: params.id,
        account: { householdId: household.id },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: { message: "Transaction not found" } }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const amount = transaction.amount;

      if (transaction.type === "EXPENSE") {
        await tx.account.update({
          where: { id: transaction.accountId },
          data: { currentBalance: { increment: amount } },
        });
      } else if (transaction.type === "INCOME") {
        await tx.account.update({
          where: { id: transaction.accountId },
          data: { currentBalance: { decrement: amount } },
        });
      } else if (transaction.type === "TRANSFER") {
        await tx.account.update({
          where: { id: transaction.accountId },
          data: { currentBalance: { increment: amount } },
        });
        if (transaction.transferAccountId) {
          await tx.account.update({
            where: { id: transaction.transferAccountId },
            data: { currentBalance: { decrement: amount } },
          });
        }
      }

      await tx.transaction.delete({
        where: { id: params.id },
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
