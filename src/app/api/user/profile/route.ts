import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);

    return NextResponse.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        username: user.user_metadata?.username || user.email?.split("@")[0] || "username",
        workspaceName: household.name,
        workspaceCreatedAt: household.createdAt,
      },
    });
  } catch (error) {
    console.error("GET /api/user/profile error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch user profile" } },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const json = await request.json();
    const { name, username, workspaceName } = json;

    const household = await getOrCreateHouseholdForUser(user.id, user.email);

    if (workspaceName && workspaceName.trim()) {
      await prisma.household.update({
        where: { id: household.id },
        data: { name: workspaceName.trim() },
      });
    }

    return NextResponse.json({
      data: {
        id: user.id,
        email: user.email,
        name: name || user.email?.split("@")[0],
        username: username || user.email?.split("@")[0],
        workspaceName: workspaceName || household.name,
        workspaceCreatedAt: household.createdAt,
      },
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("PUT /api/user/profile error:", error);
    return NextResponse.json(
      { error: { message: "Failed to update profile" } },
      { status: 500 }
    );
  }
}
