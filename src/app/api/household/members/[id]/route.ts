import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const params = context?.params ? await Promise.resolve(context.params) : { id: "" };
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: { message: "Member ID is required" } }, { status: 400 });
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const member = await prisma.householdMember.findFirst({
      where: { id, householdId: household.id },
    });

    if (!member) {
      return NextResponse.json({ error: { message: "Member not found" } }, { status: 404 });
    }

    return NextResponse.json({ data: member });
  } catch (error) {
    console.error("GET /api/household/members/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch household member" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const params = context?.params ? await Promise.resolve(context.params) : { id: "" };
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: { message: "Member ID is required" } }, { status: 400 });
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const member = await prisma.householdMember.findFirst({
      where: { id, householdId: household.id },
    });

    if (!member) {
      return NextResponse.json({ error: { message: "Member not found" } }, { status: 404 });
    }

    // Protect against deleting the household creator
    if (member.role === "OWNER" && member.userId === user.id) {
      return NextResponse.json(
        { error: { message: "Cannot remove household owner" } },
        { status: 400 }
      );
    }

    await prisma.householdMember.delete({
      where: { id },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("DELETE /api/household/members/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to remove household member" } },
      { status: 500 }
    );
  }
}
