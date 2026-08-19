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
    const needs = await prisma.needItem.findMany({
      where: { householdId: household.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: needs });
  } catch (error) {
    console.error("GET /api/needs error:", error);
    return NextResponse.json({ error: { message: "Failed to fetch needs" } }, { status: 500 });
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
    const { title, category, estimatedCost, isFulfilled, notes } = json;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: { message: "Item title is required" } }, { status: 400 });
    }

    const newNeed = await prisma.needItem.create({
      data: {
        householdId: household.id,
        title: title.trim(),
        category: category || "MUST_HAVE",
        estimatedCost: new Prisma.Decimal(estimatedCost || 0),
        isFulfilled: isFulfilled || false,
        notes: notes || null,
      },
    });

    return NextResponse.json({ data: newNeed }, { status: 201 });
  } catch (error) {
    console.error("POST /api/needs error:", error);
    return NextResponse.json({ error: { message: "Failed to create need item" } }, { status: 500 });
  }
}
