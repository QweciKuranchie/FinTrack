import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateHouseholdForUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCachedFxRates, convertCurrency } from "@/lib/fx";
import Decimal from "decimal.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const household = await getOrCreateHouseholdForUser(user.id, user.email);
    const fxRates = await getCachedFxRates();

    const accounts = await prisma.account.findMany({
      where: { householdId: household.id, isArchived: false },
    });

    let totalAccountsGhs = new Decimal(0);
    accounts.forEach((acc) => {
      totalAccountsGhs = totalAccountsGhs.plus(
        convertCurrency(acc.currentBalance.toString(), acc.currency, "GHS", fxRates)
      );
    });

    const assets = await prisma.asset.findMany({ where: { householdId: household.id } });
    let totalAssetsGhs = new Decimal(0);
    assets.forEach((ast) => {
      totalAssetsGhs = totalAssetsGhs.plus(
        convertCurrency(ast.currentValue.toString(), ast.currency, "GHS", fxRates)
      );
    });

    const liabilities = await prisma.liability.findMany({ where: { householdId: household.id } });
    let totalLiabilitiesGhs = new Decimal(0);
    liabilities.forEach((liab) => {
      totalLiabilitiesGhs = totalLiabilitiesGhs.plus(
        convertCurrency(liab.currentBalance.toString(), liab.currency, "GHS", fxRates)
      );
    });

    const netWorth = totalAccountsGhs.plus(totalAssetsGhs).minus(totalLiabilitiesGhs);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>FinTrack Monthly Financial Report</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #111; }
            h1 { color: #0F766E; margin-bottom: 5px; }
            .meta { color: #666; font-size: 14px; margin-bottom: 30px; }
            .card { background: #FAFAF9; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
            .amount { font-size: 28px; font-weight: bold; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>FinTrack Monthly Report</h1>
          <div className="meta">Household: ${household.name} • Generated: ${new Date().toLocaleDateString()}</div>
          
          <div className="card">
            <div>Total Net Worth</div>
            <div className="amount">GHS ${netWorth.toFixed(2)}</div>
          </div>

          <div style="display: flex; gap: 20px;">
            <div className="card" style="flex: 1;">
              <div>Liquid Accounts</div>
              <div style="font-weight: bold; font-size: 18px; margin-top: 5px;">GHS ${totalAccountsGhs.toFixed(2)}</div>
            </div>
            <div className="card" style="flex: 1;">
              <div>Non-Liquid Assets</div>
              <div style="font-weight: bold; font-size: 18px; margin-top: 5px;">GHS ${totalAssetsGhs.toFixed(2)}</div>
            </div>
            <div className="card" style="flex: 1;">
              <div>Total Liabilities</div>
              <div style="font-weight: bold; font-size: 18px; margin-top: 5px; color: #dc2626;">GHS ${totalLiabilitiesGhs.toFixed(2)}</div>
            </div>
          </div>

          <h3>Accounts Summary</h3>
          <table>
            <thead>
              <tr><th>Account</th><th>Type</th><th>Balance</th><th>GHS Equivalent</th></tr>
            </thead>
            <tbody>
              ${accounts
                .map(
                  (a) => `
                <tr>
                  <td>${a.name}</td>
                  <td>${a.type}</td>
                  <td>${a.currency} ${Number(a.currentBalance).toFixed(2)}</td>
                  <td>GHS ${convertCurrency(a.currentBalance.toString(), a.currency, "GHS", fxRates).toFixed(2)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `;

    return new Response(htmlContent, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("GET /api/export/pdf error:", error);
    return NextResponse.json(
      { error: { message: "Failed to generate report" } },
      { status: 500 }
    );
  }
}
