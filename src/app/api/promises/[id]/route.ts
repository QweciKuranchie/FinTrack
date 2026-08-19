import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const json = await request.json();

    if (json.dueDate) {
      json.dueDate = new Date(json.dueDate);
    }

    const updated = await prisma.promisePledge.updateMany({
      where: { id: params.id, householdId: household.id },
      data: json,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/promises/[id] error:", error);
    return NextResponse.json({ error: { message: "Failed to update promise pledge" } }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    await prisma.promisePledge.deleteMany({
      where: { id: params.id, householdId: household.id },
    });

    return NextResponse.json({ message: "Promise pledge deleted" });
  } catch (error) {
    console.error("DELETE /api/promises/[id] error:", error);
    return NextResponse.json({ error: { message: "Failed to delete promise pledge" } }, { status: 500 });
  }
}
