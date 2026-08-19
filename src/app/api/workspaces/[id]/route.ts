import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: { message: "Workspace ID is required" } }, { status: 400 });
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const json = await request.json();
    const { name } = json;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: { message: "Workspace name is required" } }, { status: 400 });
    }

    // Verify user membership
    const member = await prisma.householdMember.findFirst({
      where: { userId: user.id, householdId: id },
    });

    if (!member) {
      return NextResponse.json({ error: { message: "Workspace not found or permission denied" } }, { status: 404 });
    }

    const updatedWorkspace = await prisma.household.update({
      where: { id },
      data: { name: name.trim() },
    });

    return NextResponse.json({
      data: updatedWorkspace,
      message: "Workspace updated successfully",
    });
  } catch (error) {
    console.error("PATCH /api/workspaces/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to update workspace" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: { message: "Workspace ID is required" } }, { status: 400 });
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    // Find user's workspace memberships
    const userMemberships = await prisma.householdMember.findMany({
      where: { userId: user.id },
      include: { household: true },
    });

    if (userMemberships.length <= 1) {
      return NextResponse.json(
        { error: { message: "Cannot delete your only workspace. You must maintain at least one workspace." } },
        { status: 400 }
      );
    }

    const targetMembership = userMemberships.find((m) => m.householdId === id);
    if (!targetMembership) {
      return NextResponse.json({ error: { message: "Workspace not found or access denied" } }, { status: 404 });
    }

    // Check user profile active household
    const profile = await prisma.userProfile.findUnique({
      where: { id: user.id },
    });

    // Pick another workspace to switch to if deleting active workspace
    const remainingMembership = userMemberships.find((m) => m.householdId !== id);
    if (profile?.activeHouseholdId === id && remainingMembership) {
      await prisma.userProfile.update({
        where: { id: user.id },
        data: { activeHouseholdId: remainingMembership.householdId },
      });
    }

    // Delete workspace and related dependencies in transaction
    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { account: { householdId: id } } }),
      prisma.account.deleteMany({ where: { householdId: id } }),
      prisma.category.deleteMany({ where: { householdId: id } }),
      prisma.budget.deleteMany({ where: { householdId: id } }),
      prisma.repairTask.deleteMany({ where: { householdId: id } }),
      prisma.needItem.deleteMany({ where: { householdId: id } }),
      prisma.promisePledge.deleteMany({ where: { householdId: id } }),
      prisma.syncFeed.deleteMany({ where: { householdId: id } }),
      prisma.householdMember.deleteMany({ where: { householdId: id } }),
      prisma.household.delete({ where: { id } }),
    ]);

    return NextResponse.json({
      message: "Workspace deleted successfully",
      newActiveWorkspaceId: remainingMembership?.householdId,
    });
  } catch (error) {
    console.error("DELETE /api/workspaces/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to delete workspace" } },
      { status: 500 }
    );
  }
}
