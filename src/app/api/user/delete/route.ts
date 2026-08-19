import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function DELETE() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);

    // Delete user household and all linked cascade data
    await prisma.household.delete({
      where: { id: household.id },
    });

    return NextResponse.json({
      message: "Account and workspace data successfully deleted",
    });
  } catch (error) {
    console.error("DELETE /api/user/delete error:", error);
    return NextResponse.json(
      { error: { message: "Failed to delete account data" } },
      { status: 500 }
    );
  }
}
