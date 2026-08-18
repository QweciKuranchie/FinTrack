import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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
      return NextResponse.json({ error: { message: "Liability ID is required" } }, { status: 400 });
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const liability = await prisma.liability.findFirst({
      where: { id, householdId: household.id },
    });

    if (!liability) {
      return NextResponse.json({ error: { message: "Liability not found" } }, { status: 404 });
    }

    return NextResponse.json({ data: liability });
  } catch (error) {
    console.error("GET /api/liabilities/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch liability" } },
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
      return NextResponse.json({ error: { message: "Liability ID is required" } }, { status: 400 });
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const existingLiability = await prisma.liability.findFirst({
      where: { id, householdId: household.id },
    });

    if (!existingLiability) {
      return NextResponse.json({ error: { message: "Liability not found" } }, { status: 404 });
    }

    const json = await request.json();
    const updatedLiability = await prisma.liability.update({
      where: { id },
      data: {
        name: json.name ?? existingLiability.name,
        type: json.type ?? existingLiability.type,
        principal: json.principal !== undefined ? new Prisma.Decimal(json.principal) : existingLiability.principal,
        currentBalance: json.currentBalance !== undefined ? new Prisma.Decimal(json.currentBalance) : existingLiability.currentBalance,
        interestRate: json.interestRate !== undefined ? (json.interestRate ? new Prisma.Decimal(json.interestRate) : null) : existingLiability.interestRate,
        minimumPayment: json.minimumPayment !== undefined ? (json.minimumPayment ? new Prisma.Decimal(json.minimumPayment) : null) : existingLiability.minimumPayment,
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

export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const params = context?.params ? await Promise.resolve(context.params) : { id: "" };
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: { message: "Liability ID is required" } }, { status: 400 });
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const existingLiability = await prisma.liability.findFirst({
      where: { id, householdId: household.id },
    });

    if (!existingLiability) {
      return NextResponse.json({ error: { message: "Liability not found" } }, { status: 404 });
    }

    await prisma.liability.delete({
      where: { id },
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
