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

    const updated = await prisma.repairTask.updateMany({
      where: { id: params.id, householdId: household.id },
      data: json,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/repairs/[id] error:", error);
    return NextResponse.json({ error: { message: "Failed to update repair task" } }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    await prisma.repairTask.deleteMany({
      where: { id: params.id, householdId: household.id },
    });

    return NextResponse.json({ message: "Repair task deleted" });
  } catch (error) {
    console.error("DELETE /api/repairs/[id] error:", error);
    return NextResponse.json({ error: { message: "Failed to delete repair task" } }, { status: 500 });
  }
}
