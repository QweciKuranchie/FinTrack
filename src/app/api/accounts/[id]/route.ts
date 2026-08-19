import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: { message: "Account ID is required" } }, { status: 400 });
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const account = await prisma.account.findFirst({
      where: {
        id,
        householdId: household.id,
      },
      include: {
        transactions: {
          take: 50,
          orderBy: { date: "desc" },
          include: { category: true },
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: { message: "Account not found" } }, { status: 404 });
    }

    return NextResponse.json({ data: account });
  } catch (error) {
    console.error("GET /api/accounts/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch account" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: { message: "Account ID is required" } }, { status: 400 });
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const json = await request.json();
    const household = await getOrCreateHouseholdForUser(user.id, user.email);

    const existingAccount = await prisma.account.findFirst({
      where: { id, householdId: household.id },
    });

    if (!existingAccount) {
      return NextResponse.json({ error: { message: "Account not found" } }, { status: 404 });
    }

    const updatedAccount = await prisma.account.update({
      where: { id },
      data: {
        name: json.name ?? existingAccount.name,
        type: json.type ?? existingAccount.type,
        institution: json.institution ?? existingAccount.institution,
        currency: json.currency ?? existingAccount.currency,
        currentBalance: json.currentBalance !== undefined ? json.currentBalance : existingAccount.currentBalance,
        isArchived: json.isArchived ?? existingAccount.isArchived,
      },
    });

    return NextResponse.json({ data: updatedAccount });
  } catch (error) {
    console.error("PATCH /api/accounts/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to update account" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: { message: "Account ID is required" } }, { status: 400 });
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const existingAccount = await prisma.account.findFirst({
      where: { id, householdId: household.id },
    });

    if (!existingAccount) {
      return NextResponse.json({ error: { message: "Account not found" } }, { status: 404 });
    }

    await prisma.account.update({
      where: { id },
      data: { isArchived: true },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("DELETE /api/accounts/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to archive account" } },
      { status: 500 }
    );
  }
}
