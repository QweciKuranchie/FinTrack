import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subscriptionSchema } from "@/lib/validation/subscription-budget";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const subscriptions = await prisma.subscription.findMany({
      where: { householdId: household.id },
      orderBy: { nextRenewalDate: "asc" },
    });

    return NextResponse.json({ data: subscriptions });
  } catch (error) {
    console.error("GET /api/subscriptions error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch subscriptions" } },
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
    const validation = subscriptionSchema.safeParse(json);
    if (!validation.success) {
      return NextResponse.json(
        { error: { message: "Validation error", details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const {
      name,
      amount,
      currency,
      billingCycle,
      nextRenewalDate,
      categoryId,
      isActive,
      reminderDaysBefore,
    } = validation.data;

    const subscription = await prisma.subscription.create({
      data: {
        householdId: household.id,
        name,
        amount: new Prisma.Decimal(amount),
        currency,
        billingCycle,
        nextRenewalDate: new Date(nextRenewalDate),
        categoryId: categoryId || null,
        isActive,
        reminderDaysBefore,
      },
    });

    return NextResponse.json({ data: subscription }, { status: 201 });
  } catch (error) {
    console.error("POST /api/subscriptions error:", error);
    return NextResponse.json(
      { error: { message: "Failed to create subscription" } },
      { status: 500 }
    );
  }
}
