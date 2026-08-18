import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const rates = await prisma.fxRate.findMany({
      orderBy: { fetchedAt: "desc" },
    });

    return NextResponse.json({ data: rates });
  } catch (error) {
    console.error("GET /api/fx/rates error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch FX rates" } },
      { status: 500 }
    );
  }
}
