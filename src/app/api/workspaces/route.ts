import { NextResponse } from "next/server";
import { getAuthUser, seedDefaultCategories } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { id: user.id },
    });

    const members = await prisma.householdMember.findMany({
      where: { userId: user.id },
      include: {
        household: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    const workspaces = members.map((m) => ({
      id: m.household.id,
      name: m.household.name,
      role: m.role,
      memberCount: m.household._count.members,
      createdAt: m.household.createdAt,
      isCurrentActive: profile?.activeHouseholdId ? profile.activeHouseholdId === m.household.id : m.id === members[0]?.id,
    }));

    return NextResponse.json({ data: workspaces });
  } catch (error) {
    console.error("GET /api/workspaces error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch workspaces" } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const json = await request.json();
    const { name } = json;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: { message: "Workspace name is required" } }, { status: 400 });
    }

    // 1. Create Household
    const newHousehold = await prisma.household.create({
      data: {
        name: name.trim(),
        createdBy: user.id,
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      },
    });

    // 2. Seed Default Categories
    await seedDefaultCategories(newHousehold.id);

    // 3. Set as Active Workspace on UserProfile
    await prisma.userProfile.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email || "",
        activeHouseholdId: newHousehold.id,
      },
      update: {
        activeHouseholdId: newHousehold.id,
      },
    });

    return NextResponse.json({
      data: {
        id: newHousehold.id,
        name: newHousehold.name,
        role: "OWNER",
        memberCount: 1,
        createdAt: newHousehold.createdAt,
        isCurrentActive: true,
      },
      message: "Workspace created successfully",
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/workspaces error:", error);
    return NextResponse.json(
      { error: { message: "Failed to create workspace" } },
      { status: 500 }
    );
  }
}
