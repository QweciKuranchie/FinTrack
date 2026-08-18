import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validation/finance";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const categories = await prisma.category.findMany({
      where: {
        OR: [{ householdId: household.id }, { householdId: null }],
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch categories" } },
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
    const validation = categorySchema.safeParse(json);
    if (!validation.success) {
      return NextResponse.json(
        { error: { message: "Validation error", details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const category = await prisma.category.create({
      data: {
        householdId: household.id,
        name: validation.data.name,
        type: validation.data.type,
        icon: validation.data.icon,
        color: validation.data.color,
      },
    });

    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    console.error("POST /api/categories error:", error);
    return NextResponse.json(
      { error: { message: "Failed to create category" } },
      { status: 500 }
    );
  }
}
