import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCachedFxRates, convertCurrency } from "@/lib/fx";
import { Prisma } from "@prisma/client";
import Decimal from "decimal.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get("authorization");
    const secret = searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      const isAuthorized =
        secret === cronSecret || authHeader === `Bearer ${cronSecret}`;
      if (!isAuthorized) {
        return NextResponse.json({ error: { message: "Unauthorized cron request" } }, { status: 401 });
      }
    }

    const fxRates = await getCachedFxRates();
    const households = await prisma.household.findMany();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let snapshotsCreated = 0;

    for (const household of households) {
      // Liquid Accounts Balance
      const accounts = await prisma.account.findMany({
        where: { householdId: household.id, isArchived: false },
      });
      let totalAccountsBalanceGhs = new Decimal(0);
      accounts.forEach((acc) => {
        totalAccountsBalanceGhs = totalAccountsBalanceGhs.plus(
          convertCurrency(acc.currentBalance.toString(), acc.currency, "GHS", fxRates)
        );
      });

      // Assets
      const assets = await prisma.asset.findMany({
        where: { householdId: household.id },
      });
      let totalAssetsGhs = new Decimal(0);
      assets.forEach((ast) => {
        totalAssetsGhs = totalAssetsGhs.plus(
          convertCurrency(ast.currentValue.toString(), ast.currency, "GHS", fxRates)
        );
      });

      // Liabilities
      const liabilities = await prisma.liability.findMany({
        where: { householdId: household.id },
      });
      let totalLiabilitiesGhs = new Decimal(0);
      liabilities.forEach((liab) => {
        totalLiabilitiesGhs = totalLiabilitiesGhs.plus(
          convertCurrency(liab.currentBalance.toString(), liab.currency, "GHS", fxRates)
        );
      });

      const totalAssets = totalAccountsBalanceGhs.plus(totalAssetsGhs);
      const netWorth = totalAssets.minus(totalLiabilitiesGhs);

      await prisma.netWorthSnapshot.upsert({
        where: {
          householdId_date: {
            householdId: household.id,
            date: today,
          },
        },
        update: {
          totalAssets: new Prisma.Decimal(totalAssets.toString()),
          totalLiabilities: new Prisma.Decimal(totalLiabilitiesGhs.toString()),
          netWorth: new Prisma.Decimal(netWorth.toString()),
          currency: "GHS",
        },
        create: {
          householdId: household.id,
          date: today,
          totalAssets: new Prisma.Decimal(totalAssets.toString()),
          totalLiabilities: new Prisma.Decimal(totalLiabilitiesGhs.toString()),
          netWorth: new Prisma.Decimal(netWorth.toString()),
          currency: "GHS",
        },
      });

      snapshotsCreated++;
    }

    return NextResponse.json({
      data: {
        success: true,
        date: today.toISOString().split("T")[0],
        snapshotsCreated,
      },
    });
  } catch (error) {
    console.error("GET /api/cron/net-worth-snapshot error:", error);
    return NextResponse.json(
      { error: { message: "Failed to generate net worth snapshot" } },
      { status: 500 }
    );
  }
}
