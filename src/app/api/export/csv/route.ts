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
    const transactions = await prisma.transaction.findMany({
      where: { account: { householdId: household.id } },
      include: {
        account: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    });

    const headers = ["ID", "Date", "Account", "Category", "Type", "Amount", "Currency", "Description", "Source"];
    const rows = transactions.map((t) => [
      t.id,
      t.date.toISOString().split("T")[0],
      `"${(t.account?.name || "").replace(/"/g, '""')}"`,
      `"${(t.category?.name || "").replace(/"/g, '""')}"`,
      t.type,
      Number(t.amount).toFixed(2),
      t.currency,
      `"${(t.description || "").replace(/"/g, '""')}"`,
      t.source,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="fintrack-transactions-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/export/csv error:", error);
    return NextResponse.json(
      { error: { message: "Failed to export CSV" } },
      { status: 500 }
    );
  }
}
