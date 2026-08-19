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

    let profile = await prisma.userProfile.findUnique({
      where: { id: user.id },
    });

    if (!profile) {
      profile = await prisma.userProfile.create({
        data: {
          id: user.id,
          email: user.email || "",
          name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          username: user.user_metadata?.username || user.email?.split("@")[0] || "username",
        },
      });
    }

    return NextResponse.json({
      data: {
        id: profile.id,
        email: profile.email,
        name: profile.name || user.email?.split("@")[0] || "User",
        username: profile.username || user.email?.split("@")[0] || "username",
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

    const updatedProfile = await prisma.userProfile.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email || "",
        name: name?.trim() || null,
        username: username?.trim() || null,
      },
      update: {
        name: name?.trim() || null,
        username: username?.trim() || null,
      },
    });

    return NextResponse.json({
      data: {
        id: updatedProfile.id,
        email: updatedProfile.email,
        name: updatedProfile.name || user.email?.split("@")[0],
        username: updatedProfile.username || user.email?.split("@")[0],
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
