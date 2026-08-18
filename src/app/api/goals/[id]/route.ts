import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const params = context?.params ? await Promise.resolve(context.params) : { id: "" };
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: { message: "Goal ID is required" } }, { status: 400 });
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const goal = await prisma.savingsGoal.findFirst({
      where: { id, householdId: household.id },
      include: { account: true },
    });

    if (!goal) {
      return NextResponse.json({ error: { message: "Savings goal not found" } }, { status: 404 });
    }

    return NextResponse.json({ data: goal });
  } catch (error) {
    console.error("GET /api/goals/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch savings goal" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const params = context?.params ? await Promise.resolve(context.params) : { id: "" };
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: { message: "Goal ID is required" } }, { status: 400 });
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const existing = await prisma.savingsGoal.findFirst({
      where: { id, householdId: household.id },
    });

    if (!existing) {
      return NextResponse.json({ error: { message: "Savings goal not found" } }, { status: 404 });
    }

    const json = await request.json();
    const updated = await prisma.savingsGoal.update({
      where: { id },
      data: {
        name: json.name ?? existing.name,
        targetAmount: json.targetAmount !== undefined ? new Prisma.Decimal(json.targetAmount) : existing.targetAmount,
        currentAmount: json.currentAmount !== undefined ? new Prisma.Decimal(json.currentAmount) : existing.currentAmount,
        deadline: json.deadline ? new Date(json.deadline) : existing.deadline,
        currency: json.currency ?? existing.currency,
        accountId: json.accountId !== undefined ? json.accountId : existing.accountId,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/goals/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to update savings goal" } },
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
      return NextResponse.json({ error: { message: "Goal ID is required" } }, { status: 400 });
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const existing = await prisma.savingsGoal.findFirst({
      where: { id, householdId: household.id },
    });

    if (!existing) {
      return NextResponse.json({ error: { message: "Savings goal not found" } }, { status: 404 });
    }

    await prisma.savingsGoal.delete({
      where: { id },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("DELETE /api/goals/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to delete savings goal" } },
      { status: 500 }
    );
  }
}
