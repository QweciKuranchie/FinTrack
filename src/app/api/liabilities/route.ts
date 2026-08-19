import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

    const [liabilities, totalCount] = await Promise.all([
      prisma.liability.findMany({
        where: { householdId: household.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.liability.count({
        where: { householdId: household.id },
      }),
    ]);

    return NextResponse.json({
      data: liabilities,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
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
    const household = await getOrCreateHouseholdForUser(user.id, user.email);

    const {
      name,
      counterparty,
      isReceivable,
      type,
      principal,
      currentBalance,
      dueDate,
      notes,
      currency,
    } = json;

    if (!name || principal === undefined || principal === null) {
      return NextResponse.json(
        { error: { message: "Name and principal amount are required" } },
        { status: 400 }
      );
    }

    const liability = await prisma.liability.create({
      data: {
        householdId: household.id,
        name,
        counterparty: counterparty || null,
        isReceivable: Boolean(isReceivable),
        type: type || "OTHER",
        principal: new Prisma.Decimal(principal),
        currentBalance: new Prisma.Decimal(currentBalance !== undefined && currentBalance !== null ? currentBalance : principal),
        dueDate: dueDate ? new Date(dueDate) : null,
        currency: currency || "GHS",
        notes: notes || null,
      },
    });

    return NextResponse.json({ data: liability }, { status: 201 });
  } catch (error) {
    console.error("POST /api/liabilities error:", error);
    return NextResponse.json(
      { error: { message: "Failed to create liability record" } },
      { status: 500 }
    );
  }
}
