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

    const [debtRecords, totalCount] = await Promise.all([
      prisma.debtRecord.findMany({
        where: { householdId: household.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.debtRecord.count({
        where: { householdId: household.id },
      }),
    ]);

    const formattedRecords = debtRecords.map((item) => ({
      ...item,
      amount: Number(item.amount),
      currentBalance: Number(item.currentBalance),
    }));

    return NextResponse.json({
      data: formattedRecords,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/debt-tracker error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch debt tracker records" } },
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

    const { title, counterparty, isReceivable, amount, currentBalance, dueDate, notes, currency } = json;

    if (!title || amount === undefined || amount === null) {
      return NextResponse.json(
        { error: { message: "Debt title and total amount are required" } },
        { status: 400 }
      );
    }

    const debtRecord = await prisma.debtRecord.create({
      data: {
        householdId: household.id,
        title: title || "Personal Debt",
        counterparty: counterparty || "General",
        isReceivable: Boolean(isReceivable),
        amount: new Prisma.Decimal(amount),
        currentBalance: new Prisma.Decimal(currentBalance !== undefined && currentBalance !== null ? currentBalance : amount),
        dueDate: dueDate ? new Date(dueDate) : null,
        currency: currency || "GHS",
        notes: notes || null,
      },
    });

    return NextResponse.json(
      {
        data: {
          ...debtRecord,
          amount: Number(debtRecord.amount),
          currentBalance: Number(debtRecord.currentBalance),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/debt-tracker error:", error);
    return NextResponse.json(
      { error: { message: "Failed to create debt tracker record" } },
      { status: 500 }
    );
  }
}
