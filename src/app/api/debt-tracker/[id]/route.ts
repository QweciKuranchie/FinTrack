import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const { id } = params;
    const household = await getOrCreateHouseholdForUser(user.id, user.email);

    const existingRecord = await prisma.debtRecord.findFirst({
      where: { id, householdId: household.id },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: { message: "Debt record not found" } }, { status: 404 });
    }

    const json = await request.json();
    const updatedRecord = await prisma.debtRecord.update({
      where: { id },
      data: {
        title: json.title ?? existingRecord.title,
        counterparty: json.counterparty !== undefined ? json.counterparty : existingRecord.counterparty,
        isReceivable: json.isReceivable !== undefined ? Boolean(json.isReceivable) : existingRecord.isReceivable,
        amount: json.amount !== undefined ? new Prisma.Decimal(json.amount) : existingRecord.amount,
        currentBalance: json.currentBalance !== undefined ? new Prisma.Decimal(json.currentBalance) : existingRecord.currentBalance,
        dueDate: json.dueDate !== undefined ? (json.dueDate ? new Date(json.dueDate) : null) : existingRecord.dueDate,
        currency: json.currency ?? existingRecord.currency,
        notes: json.notes !== undefined ? json.notes : existingRecord.notes,
      },
    });

    return NextResponse.json({
      data: {
        ...updatedRecord,
        amount: Number(updatedRecord.amount),
        currentBalance: Number(updatedRecord.currentBalance),
      },
    });
  } catch (error) {
    console.error("PATCH /api/debt-tracker/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to update debt record" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const { id } = params;
    const household = await getOrCreateHouseholdForUser(user.id, user.email);

    const existingRecord = await prisma.debtRecord.findFirst({
      where: { id, householdId: household.id },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: { message: "Debt record not found" } }, { status: 404 });
    }

    await prisma.debtRecord.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Debt record deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/debt-tracker/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to delete debt record" } },
      { status: 500 }
    );
  }
}
