import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { goalSchema } from "@/lib/validation/investments-goals";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const household = await getOrCreateHouseholdForUser(user.id, user.email);

    const [goals, totalCount] = await Promise.all([
      prisma.savingsGoal.findMany({
        where: { householdId: household.id },
        include: { account: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.savingsGoal.count({
        where: { householdId: household.id },
      }),
    ]);

    const goalsWithProgress = goals.map((g) => {
      const target = Number(g.targetAmount);
      const current = Number(g.currentAmount);
      const percent = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
      return {
        ...g,
        targetAmount: target,
        currentAmount: current,
        percentage: percent,
      };
    });

    return NextResponse.json({
      data: goalsWithProgress,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/goals error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch savings goals" } },
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
    const validation = goalSchema.safeParse(json);
    if (!validation.success) {
      return NextResponse.json(
        { error: { message: "Validation error", details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const { name, targetAmount, currentAmount, deadline, currency, accountId } = validation.data;

    const goal = await prisma.savingsGoal.create({
      data: {
        householdId: household.id,
        name,
        targetAmount: new Prisma.Decimal(targetAmount),
        currentAmount: new Prisma.Decimal(currentAmount),
        deadline: deadline ? new Date(deadline) : null,
        currency,
        accountId: accountId || null,
      },
    });

    return NextResponse.json({ data: goal }, { status: 201 });
  } catch (error) {
    console.error("POST /api/goals error:", error);
    return NextResponse.json(
      { error: { message: "Failed to create savings goal" } },
      { status: 500 }
    );
  }
}
