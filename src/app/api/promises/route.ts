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
    const promises = await prisma.promisePledge.findMany({
      where: { householdId: household.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: promises });
  } catch (error) {
    console.error("GET /api/promises error:", error);
    return NextResponse.json({ error: { message: "Failed to fetch promises" } }, { status: 500 });
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
    const { type, recipient, purpose, amount, dueDate, status, notes } = json;

    if (!recipient || !recipient.trim()) {
      return NextResponse.json({ error: { message: "Recipient name is required" } }, { status: 400 });
    }

    const newPromise = await prisma.promisePledge.create({
      data: {
        householdId: household.id,
        type: type || "PROMISED_BY_ME",
        recipient: recipient.trim(),
        purpose: purpose ? purpose.trim() : "General Pledge",
        amount: new Prisma.Decimal(amount || 0),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: status || "PENDING",
        notes: notes || null,
      },
    });

    return NextResponse.json({ data: newPromise }, { status: 201 });
  } catch (error) {
    console.error("POST /api/promises error:", error);
    return NextResponse.json({ error: { message: "Failed to create promise pledge" } }, { status: 500 });
  }
}
