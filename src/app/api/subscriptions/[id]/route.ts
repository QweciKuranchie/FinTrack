import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await Promise.resolve(params);
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const subscription = await prisma.subscription.findFirst({
      where: { id, householdId: household.id },
    });

    if (!subscription) {
      return NextResponse.json({ error: { message: "Subscription not found" } }, { status: 404 });
    }

    return NextResponse.json({ data: subscription });
  } catch (error) {
    console.error("GET /api/subscriptions/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch subscription" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await Promise.resolve(params);
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const existingSub = await prisma.subscription.findFirst({
      where: { id, householdId: household.id },
    });

    if (!existingSub) {
      return NextResponse.json({ error: { message: "Subscription not found" } }, { status: 404 });
    }

    const json = await request.json();
    const updatedSub = await prisma.subscription.update({
      where: { id },
      data: {
        name: json.name ?? existingSub.name,
        amount: json.amount !== undefined ? new Prisma.Decimal(json.amount) : existingSub.amount,
        currency: json.currency ?? existingSub.currency,
        billingCycle: json.billingCycle ?? existingSub.billingCycle,
        nextRenewalDate: json.nextRenewalDate ? new Date(json.nextRenewalDate) : existingSub.nextRenewalDate,
        isActive: json.isActive !== undefined ? json.isActive : existingSub.isActive,
        reminderDaysBefore: json.reminderDaysBefore ?? existingSub.reminderDaysBefore,
      },
    });

    return NextResponse.json({ data: updatedSub });
  } catch (error) {
    console.error("PATCH /api/subscriptions/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to update subscription" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await Promise.resolve(params);
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const existingSub = await prisma.subscription.findFirst({
      where: { id, householdId: household.id },
    });

    if (!existingSub) {
      return NextResponse.json({ error: { message: "Subscription not found" } }, { status: 404 });
    }

    await prisma.subscription.delete({
      where: { id },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("DELETE /api/subscriptions/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to delete subscription" } },
      { status: 500 }
    );
  }
}
