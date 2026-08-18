import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function PATCH(request: Request, props: RouteContext) {
  try {
    const params = await props.params;
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const existing = await prisma.category.findFirst({
      where: { id: params.id, householdId: household.id },
    });

    if (!existing) {
      return NextResponse.json({ error: { message: "Custom category not found or system default" } }, { status: 404 });
    }

    const json = await request.json();
    const updated = await prisma.category.update({
      where: { id: params.id },
      data: {
        name: json.name ?? existing.name,
        icon: json.icon ?? existing.icon,
        color: json.color ?? existing.color,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/categories/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to update category" } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, props: RouteContext) {
  try {
    const params = await props.params;
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const existing = await prisma.category.findFirst({
      where: { id: params.id, householdId: household.id },
    });

    if (!existing) {
      return NextResponse.json({ error: { message: "Custom category not found or system default" } }, { status: 404 });
    }

    await prisma.category.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("DELETE /api/categories/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to delete category" } },
      { status: 500 }
    );
  }
}
