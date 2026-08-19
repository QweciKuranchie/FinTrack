import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
    const feed = await prisma.syncFeed.findMany({
      where: { householdId: household.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: feed });
  } catch (error) {
    console.error("GET /api/sync error:", error);
    return NextResponse.json({ error: { message: "Failed to fetch sync feed" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const json = await request.json();
    const { source, type, amount, description, accountName, status } = json;

    if (!description || !description.trim()) {
      return NextResponse.json({ error: { message: "Description is required" } }, { status: 400 });
    }

    const newSyncItem = await prisma.syncFeed.create({
      data: {
        householdId: household.id,
        source: source || "MoMo / Bank Parser",
        type: type || "EXPENSE",
        amount: new Prisma.Decimal(amount || 0),
        description: description.trim(),
        accountName: accountName || "Default Account",
        status: status || "PARSED",
      },
    });

    return NextResponse.json({ data: newSyncItem }, { status: 201 });
  } catch (error) {
    console.error("POST /api/sync error:", error);
    return NextResponse.json({ error: { message: "Failed to log sync entry" } }, { status: 500 });
  }
}
