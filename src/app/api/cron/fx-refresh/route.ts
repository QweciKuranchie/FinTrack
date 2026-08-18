import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get("authorization");
    const secret = searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;

    // Check CRON_SECRET authorization if set
    if (cronSecret) {
      const isAuthorized =
        secret === cronSecret || authHeader === `Bearer ${cronSecret}`;
      if (!isAuthorized) {
        return NextResponse.json({ error: { message: "Unauthorized cron request" } }, { status: 401 });
      }
    }

    // Fetch FX rates from open.er-api.com (USD base)
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch FX rates from provider: ${res.statusText}`);
    }

    const data = await res.json();
    const rates: Record<string, number> = data.rates || {};

    // Supported target currencies
    const targetCurrencies = ["GHS", "USD", "EUR", "GBP"];
    const baseCurrency = "USD";

    const upsertPromises = targetCurrencies.map((targetCurrency) => {
      const rate = rates[targetCurrency] || 1;
      return prisma.fxRate.upsert({
        where: {
          baseCurrency_targetCurrency: {
            baseCurrency,
            targetCurrency,
          },
        },
        update: {
          rate: new Prisma.Decimal(rate),
          fetchedAt: new Date(),
        },
        create: {
          baseCurrency,
          targetCurrency,
          rate: new Prisma.Decimal(rate),
          fetchedAt: new Date(),
        },
      });
    });

    // Also insert inverse USD to GHS / GHS to USD rate directly for easy lookup
    const ghsRate = rates["GHS"] || 15.0;
    if (ghsRate) {
      upsertPromises.push(
        prisma.fxRate.upsert({
          where: {
            baseCurrency_targetCurrency: {
              baseCurrency: "GHS",
              targetCurrency: "USD",
            },
          },
          update: {
            rate: new Prisma.Decimal(1 / ghsRate),
            fetchedAt: new Date(),
          },
          create: {
            baseCurrency: "GHS",
            targetCurrency: "USD",
            rate: new Prisma.Decimal(1 / ghsRate),
            fetchedAt: new Date(),
          },
        })
      );
    }

    await Promise.all(upsertPromises);

    return NextResponse.json({
      data: {
        success: true,
        baseCurrency,
        updatedCount: upsertPromises.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("GET /api/cron/fx-refresh error:", error);
    return NextResponse.json(
      { error: { message: "Failed to refresh FX rates" } },
      { status: 500 }
    );
  }
}
