import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const importRowSchema = z.object({
  date: z.string(),
  amount: z.number().positive(),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]).default("EXPENSE"),
  description: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
});

const importPayloadSchema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
  filename: z.string().default("statement.csv"),
  rows: z.array(importRowSchema).min(1, "At least one row required"),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const json = await request.json();
    const validation = importPayloadSchema.safeParse(json);
    if (!validation.success) {
      return NextResponse.json(
        { error: { message: "Validation error", details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const { accountId, filename, rows } = validation.data;

    // Verify account ownership
    const account = await prisma.account.findFirst({
      where: { id: accountId, householdId: household.id },
    });

    if (!account) {
      return NextResponse.json({ error: { message: "Account not found" } }, { status: 404 });
    }

    // Fetch existing transactions for deduplication (same account, date, amount, description)
    const existingTxns = await prisma.transaction.findMany({
      where: { accountId },
      select: { date: true, amount: true, description: true },
    });

    const existingSet = new Set(
      existingTxns.map(
        (t) => `${t.date.toISOString().split("T")[0]}_${Number(t.amount)}_${t.description || ""}`
      )
    );

    let insertedCount = 0;
    let skippedCount = 0;

    await prisma.$transaction(async (tx) => {
      let balanceAdjustment = new Prisma.Decimal(0);

      for (const row of rows) {
        const rowDate = new Date(row.date);
        const dateStr = rowDate.toISOString().split("T")[0];
        const descKey = row.description || "";
        const dedupKey = `${dateStr}_${row.amount}_${descKey}`;

        if (existingSet.has(dedupKey)) {
          skippedCount++;
          continue;
        }

        const decimalAmount = new Prisma.Decimal(row.amount);

        await tx.transaction.create({
          data: {
            accountId,
            categoryId: row.categoryId || null,
            amount: decimalAmount,
            currency: account.currency,
            type: row.type,
            description: row.description || null,
            date: rowDate,
            source: "CSV_IMPORT",
          },
        });

        insertedCount++;

        // Calculate account balance impact
        if (row.type === "EXPENSE") {
          balanceAdjustment = balanceAdjustment.minus(decimalAmount);
        } else if (row.type === "INCOME") {
          balanceAdjustment = balanceAdjustment.plus(decimalAmount);
        }
      }

      // Update account current balance
      if (!balanceAdjustment.isZero()) {
        await tx.account.update({
          where: { id: accountId },
          data: { currentBalance: { increment: balanceAdjustment } },
        });
      }

      // Write CSV import log
      await tx.csvImportLog.create({
        data: {
          accountId,
          filename,
          rowCount: insertedCount,
          status: insertedCount > 0 ? "success" : "skipped",
        },
      });
    });

    return NextResponse.json({
      data: {
        success: true,
        insertedCount,
        skippedCount,
        totalRows: rows.length,
      },
    });
  } catch (error) {
    console.error("POST /api/transactions/import error:", error);
    return NextResponse.json(
      { error: { message: "Failed to import CSV transactions" } },
      { status: 500 }
    );
  }
}
