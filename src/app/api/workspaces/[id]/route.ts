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
