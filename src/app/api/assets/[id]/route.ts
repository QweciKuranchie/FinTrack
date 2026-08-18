import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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
      return NextResponse.json({ error: { message: "Asset ID is required" } }, { status: 400 });
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const asset = await prisma.asset.findFirst({
      where: { id, householdId: household.id },
    });

    if (!asset) {
      return NextResponse.json({ error: { message: "Asset not found" } }, { status: 404 });
    }

    return NextResponse.json({ data: asset });
  } catch (error) {
    console.error("GET /api/assets/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch asset" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const params = context?.params ? await Promise.resolve(context.params) : { id: "" };
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: { message: "Asset ID is required" } }, { status: 400 });
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const existingAsset = await prisma.asset.findFirst({
      where: { id, householdId: household.id },
    });

    if (!existingAsset) {
      return NextResponse.json({ error: { message: "Asset not found" } }, { status: 404 });
    }

    const json = await request.json();
    const updatedAsset = await prisma.asset.update({
      where: { id },
      data: {
        name: json.name ?? existingAsset.name,
        type: json.type ?? existingAsset.type,
        currentValue: json.currentValue !== undefined ? new Prisma.Decimal(json.currentValue) : existingAsset.currentValue,
        currency: json.currency ?? existingAsset.currency,
        lastValuedAt: json.lastValuedAt ? new Date(json.lastValuedAt) : new Date(),
      },
    });

    return NextResponse.json({ data: updatedAsset });
  } catch (error) {
    console.error("PATCH /api/assets/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to update asset" } },
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
      return NextResponse.json({ error: { message: "Asset ID is required" } }, { status: 400 });
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const existingAsset = await prisma.asset.findFirst({
      where: { id, householdId: household.id },
    });

    if (!existingAsset) {
      return NextResponse.json({ error: { message: "Asset not found" } }, { status: 404 });
    }

    await prisma.asset.delete({
      where: { id },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("DELETE /api/assets/[id] error:", error);
    return NextResponse.json(
      { error: { message: "Failed to delete asset" } },
      { status: 500 }
    );
  }
}
