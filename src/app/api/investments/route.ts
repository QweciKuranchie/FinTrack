import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { investmentSchema } from "@/lib/validation/investments-goals";
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
    const investments = await prisma.investment.findMany({
      where: { householdId: household.id },
      orderBy: { updatedAt: "desc" },
    });

    const holdingsWithGainLoss = investments.map((inv) => {
      const qty = Number(inv.quantity);
      const avgCost = Number(inv.avgCost);
      const currentPrice = Number(inv.currentPrice);
      const totalCost = qty * avgCost;
      const currentValue = qty * currentPrice;
      const gainLoss = currentValue - totalCost;
      const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

      return {
        ...inv,
        quantity: qty,
        avgCost,
        currentPrice,
        totalCost,
        currentValue,
        gainLoss,
        gainLossPercent,
      };
    });

    return NextResponse.json({ data: holdingsWithGainLoss });
  } catch (error) {
    console.error("GET /api/investments error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch investments" } },
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
    const validation = investmentSchema.safeParse(json);
    if (!validation.success) {
      return NextResponse.json(
        { error: { message: "Validation error", details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const { symbol, name, quantity, avgCost, currentPrice, currency, assetClass, accountId } =
      validation.data;

    const investment = await prisma.investment.create({
      data: {
        householdId: household.id,
        symbol: symbol.toUpperCase(),
        name,
        quantity: new Prisma.Decimal(quantity),
        avgCost: new Prisma.Decimal(avgCost),
        currentPrice: new Prisma.Decimal(currentPrice),
        currency,
        assetClass: assetClass || null,
        accountId: accountId || null,
      },
    });

    return NextResponse.json({ data: investment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/investments error:", error);
    return NextResponse.json(
      { error: { message: "Failed to create investment" } },
      { status: 500 }
    );
  }
}
