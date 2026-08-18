import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function PATCH(request: Request, props: RouteContext) {
  try {
    const params = await props.params;
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const existingSub = await prisma.subscription.findFirst({
      where: { id: params.id, householdId: household.id },
    });

    if (!existingSub) {
      return NextResponse.json({ error: { message: "Subscription not found" } }, { status: 404 });
    }

    const json = await request.json();
    const updatedSub = await prisma.subscription.update({
      where: { id: params.id },
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

export async function DELETE(request: Request, props: RouteContext) {
  try {
    const params = await props.params;
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const existingSub = await prisma.subscription.findFirst({
      where: { id: params.id, householdId: household.id },
    });

    if (!existingSub) {
      return NextResponse.json({ error: { message: "Subscription not found" } }, { status: 404 });
    }

    await prisma.subscription.delete({
      where: { id: params.id },
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
