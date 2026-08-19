import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const json = await request.json();
    const { workspaceId } = json;

    if (!workspaceId) {
      return NextResponse.json({ error: { message: "Workspace ID is required" } }, { status: 400 });
    }

    // Verify user is a member of target workspace
    const member = await prisma.householdMember.findFirst({
      where: {
        userId: user.id,
        householdId: workspaceId,
      },
      include: { household: true },
    });

    if (!member) {
      return NextResponse.json({ error: { message: "Workspace not found or access denied" } }, { status: 404 });
    }

    // Update activeHouseholdId in UserProfile
    await prisma.userProfile.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email || "",
        activeHouseholdId: workspaceId,
      },
      update: {
        activeHouseholdId: workspaceId,
      },
    });

    return NextResponse.json({
      data: {
        activeWorkspace: {
          id: member.household.id,
          name: member.household.name,
          role: member.role,
        },
      },
      message: `Switched active workspace to "${member.household.name}"`,
    });
  } catch (error) {
    console.error("POST /api/workspaces/switch error:", error);
    return NextResponse.json(
      { error: { message: "Failed to switch workspace" } },
      { status: 500 }
    );
  }
}
