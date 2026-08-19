import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assetSchema } from "@/lib/validation/assets-liabilities";
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

    const [assets, totalCount] = await Promise.all([
      prisma.asset.findMany({
        where: { householdId: household.id },
        orderBy: { lastValuedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.asset.count({
        where: { householdId: household.id },
      }),
    ]);

    return NextResponse.json({
      data: assets,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/assets error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch assets" } },
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
    const validation = assetSchema.safeParse(json);
    if (!validation.success) {
      return NextResponse.json(
        { error: { message: "Validation error", details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const { name, type, currentValue, currency } = validation.data;

    const asset = await prisma.asset.create({
      data: {
        householdId: household.id,
        name,
        type,
        currentValue: new Prisma.Decimal(currentValue),
        currency,
        lastValuedAt: new Date(),
      },
    });

    return NextResponse.json({ data: asset }, { status: 201 });
  } catch (error) {
    console.error("POST /api/assets error:", error);
    return NextResponse.json(
      { error: { message: "Failed to create asset" } },
      { status: 500 }
    );
  }
}
