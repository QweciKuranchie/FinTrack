import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inviteMemberSchema } from "@/lib/validation/investments-goals";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const rawMembers = await prisma.householdMember.findMany({
      where: { householdId: household.id },
      orderBy: { joinedAt: "asc" },
    });

    const userIds = rawMembers.map((m) => m.userId);
    const profiles = await prisma.userProfile.findMany({
      where: {
        OR: [
          { id: { in: userIds } },
          { email: { in: userIds } },
        ],
      },
    });

    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    const emailProfileMap = new Map(profiles.map((p) => [p.email, p]));

    const membersWithNames = rawMembers.map((m) => {
      const p = profileMap.get(m.userId) || emailProfileMap.get(m.userId);
      return {
        ...m,
        userName: p?.name || (p?.username ? `@${p.username}` : null) || (p?.email ? p.email.split("@")[0] : m.userId),
        userHandle: p?.username ? `@${p.username}` : null,
        email: p?.email || (m.userId.includes("@") ? m.userId : user.email),
      };
    });

    return NextResponse.json({
      data: {
        household,
        members: membersWithNames,
      },
    });
  } catch (error) {
    console.error("GET /api/household/members error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch household members" } },
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
    const validation = inviteMemberSchema.safeParse(json);
    if (!validation.success) {
      return NextResponse.json(
        { error: { message: "Validation error", details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const { email, role } = validation.data;

    // Check if member already exists
    const member = await prisma.householdMember.create({
      data: {
        householdId: household.id,
        userId: email,
        role,
      },
    });

    return NextResponse.json({ data: member }, { status: 201 });
  } catch (error) {
    console.error("POST /api/household/members error:", error);
    return NextResponse.json(
      { error: { message: "Failed to add household member" } },
      { status: 500 }
    );
  }
}
