import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accountSchema } from "@/lib/validation/finance";
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
    const accounts = await prisma.account.findMany({
      where: {
        householdId: household.id,
        isArchived: false,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ data: accounts });
  } catch (error) {
    console.error("GET /api/accounts error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch accounts" } },
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
    const validation = accountSchema.safeParse(json);
    if (!validation.success) {
      return NextResponse.json(
        { error: { message: "Validation error", details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const { name, type, currency, openingBalance, institution } = validation.data;

    const account = await prisma.account.create({
      data: {
        householdId: household.id,
        ownerId: user.id,
        name,
        type,
        currency,
        currentBalance: new Prisma.Decimal(openingBalance),
        institution,
      },
    });

    return NextResponse.json({ data: account }, { status: 201 });
  } catch (error) {
    console.error("POST /api/accounts error:", error);
    return NextResponse.json(
      { error: { message: "Failed to create account" } },
      { status: 500 }
    );
  }
}
