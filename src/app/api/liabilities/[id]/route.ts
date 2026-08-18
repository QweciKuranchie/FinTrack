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
    const existingLiability = await prisma.liability.findFirst({
      where: { id: params.id, householdId: household.id },
    });

    if (!existingLiability) {
      return NextResponse.json({ error: { message: "Liability not found" } }, { status: 404 });
    }

    const json = await request.json();
    const updatedLiability = await prisma.liability.update({
      where: { id: params.id },
      data: {
        name: json.name ?? existingLiability.name,
        type: json.type ?? existingLiability.type,
        currentBalance: json.currentBalance !== undefined ? new Prisma.Decimal(json.currentBalance) : existingLiability.currentBalance,
        interestRate: json.interestRate !== undefined ? new Prisma.Decimal(json.interestRate) : existingLiability.interestRate,
        minimumPayment: json.minimumPayment !== undefined ? new Prisma.Decimal(json.minimumPayment) : existingLiability.minimumPayment,
        dueDate: json.dueDate !== undefined ? json.dueDate : existingLiability.dueDate,
        currency: json.currency ?? existingLiability.currency,
      },
    });

    return NextResponse.json({ data: updatedLiability });
  } catch (error) {
    console.error("PATCH /api/liabilities/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to update liability" } },
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
    const existingLiability = await prisma.liability.findFirst({
      where: { id: params.id, householdId: household.id },
    });

    if (!existingLiability) {
      return NextResponse.json({ error: { message: "Liability not found" } }, { status: 404 });
    }

    await prisma.liability.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("DELETE /api/liabilities/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to delete liability" } },
      { status: 500 }
    );
  }
}
