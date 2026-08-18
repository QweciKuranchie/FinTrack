import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await Promise.resolve(params);
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const investment = await prisma.investment.findFirst({
      where: { id, householdId: household.id },
    });

    if (!investment) {
      return NextResponse.json({ error: { message: "Investment holding not found" } }, { status: 404 });
    }

    return NextResponse.json({ data: investment });
  } catch (error) {
    console.error("GET /api/investments/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch investment holding" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await Promise.resolve(params);
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const existing = await prisma.investment.findFirst({
      where: { id, householdId: household.id },
    });

    if (!existing) {
      return NextResponse.json({ error: { message: "Investment holding not found" } }, { status: 404 });
    }

    const json = await request.json();
    const updated = await prisma.investment.update({
      where: { id },
      data: {
        symbol: json.symbol ? json.symbol.toUpperCase() : existing.symbol,
        name: json.name ?? existing.name,
        quantity: json.quantity !== undefined ? new Prisma.Decimal(json.quantity) : existing.quantity,
        avgCost: json.avgCost !== undefined ? new Prisma.Decimal(json.avgCost) : existing.avgCost,
        currentPrice: json.currentPrice !== undefined ? new Prisma.Decimal(json.currentPrice) : existing.currentPrice,
        currency: json.currency ?? existing.currency,
        assetClass: json.assetClass !== undefined ? json.assetClass : existing.assetClass,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/investments/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to update investment" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await Promise.resolve(params);
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const existing = await prisma.investment.findFirst({
      where: { id, householdId: household.id },
    });

    if (!existing) {
      return NextResponse.json({ error: { message: "Investment holding not found" } }, { status: 404 });
    }

    await prisma.investment.delete({
      where: { id },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("DELETE /api/investments/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to delete investment holding" } },
      { status: 500 }
    );
  }
}
