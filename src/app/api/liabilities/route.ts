import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { liabilitySchema } from "@/lib/validation/assets-liabilities";
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
    const liabilities = await prisma.liability.findMany({
      where: { householdId: household.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: liabilities });
  } catch (error) {
    console.error("GET /api/liabilities error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch liabilities" } },
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
    const validation = liabilitySchema.safeParse(json);
    if (!validation.success) {
      return NextResponse.json(
        { error: { message: "Validation error", details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const {
      name,
      type,
      principal,
      currentBalance,
      interestRate,
      minimumPayment,
      dueDate,
      currency,
    } = validation.data;

    const liability = await prisma.liability.create({
      data: {
        householdId: household.id,
        name,
        type,
        principal: new Prisma.Decimal(principal),
        currentBalance: new Prisma.Decimal(currentBalance),
        interestRate: interestRate !== null && interestRate !== undefined ? new Prisma.Decimal(interestRate) : null,
        minimumPayment: minimumPayment !== null && minimumPayment !== undefined ? new Prisma.Decimal(minimumPayment) : null,
        dueDate: dueDate || null,
        currency,
      },
    });

    return NextResponse.json({ data: liability }, { status: 201 });
  } catch (error) {
    console.error("POST /api/liabilities error:", error);
    return NextResponse.json(
      { error: { message: "Failed to create liability" } },
      { status: 500 }
    );
  }
}
