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
    const repairs = await prisma.repairTask.findMany({
      where: { householdId: household.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: repairs });
  } catch (error) {
    console.error("GET /api/repairs error:", error);
    return NextResponse.json({ error: { message: "Failed to fetch repairs" } }, { status: 500 });
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
    const { type, item, category, estimatedCost, status, urgency, notes } = json;

    if (!item || !item.trim()) {
      return NextResponse.json({ error: { message: "Item title is required" } }, { status: 400 });
    }

    const newRepair = await prisma.repairTask.create({
      data: {
        householdId: household.id,
        type: type || "REPAIR",
        item: item.trim(),
        category: category || "Home & Property",
        estimatedCost: new Prisma.Decimal(estimatedCost || 0),
        status: status || "PENDING",
        urgency: urgency || "MEDIUM",
        notes: notes || null,
      },
    });

    return NextResponse.json({ data: newRepair }, { status: 201 });
  } catch (error) {
    console.error("POST /api/repairs error:", error);
    return NextResponse.json({ error: { message: "Failed to create repair task" } }, { status: 500 });
  }
}
