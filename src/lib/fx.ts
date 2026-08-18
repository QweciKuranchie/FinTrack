import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export type DecimalType = InstanceType<typeof Decimal>;

/**
 * Fetch cached FX rates map from database (e.g. { "USD_GHS": 15.5, "EUR_GHS": 16.8 })
 */
export async function getCachedFxRates(): Promise<Record<string, number>> {
  const rates = await prisma.fxRate.findMany();
  const rateMap: Record<string, number> = {
    GHS_GHS: 1,
    USD_USD: 1,
    EUR_EUR: 1,
    GBP_GBP: 1,
  };

  rates.forEach((r) => {
    const key = `${r.baseCurrency}_${r.targetCurrency}`;
    rateMap[key] = Number(r.rate);
  });

  return rateMap;
}

/**
 * Convert an amount from source currency to target currency (default GHS)
 */
export function convertCurrency(
  amount: number | string | DecimalType,
  fromCurrency: string,
  toCurrency: string = "GHS",
  rates: Record<string, number> = {}
): DecimalType {
  const decAmount = new Decimal(amount.toString());
  if (fromCurrency === toCurrency) {
    return decAmount;
  }

  const directKey = `${fromCurrency}_${toCurrency}`;
  if (rates[directKey]) {
    return decAmount.times(rates[directKey]);
  }

  // Inverse rate fallback
  const inverseKey = `${toCurrency}_${fromCurrency}`;
  if (rates[inverseKey] && rates[inverseKey] !== 0) {
    return decAmount.div(rates[inverseKey]);
  }

  // Cross-rate via USD
  const fromToUsd = rates[`${fromCurrency}_USD`] || (rates[`USD_${fromCurrency}`] ? 1 / rates[`USD_${fromCurrency}`] : null);
  const usdToTarget = rates[`USD_${toCurrency}`] || (rates[`${toCurrency}_USD`] ? 1 / rates[`${toCurrency}_USD`] : null);

  if (fromToUsd && usdToTarget) {
    return decAmount.times(fromToUsd).times(usdToTarget);
  }

  // Fallback 1:1 if rate not found
  console.warn(`FX rate missing for ${fromCurrency} -> ${toCurrency}, using 1.0 fallback`);
  return decAmount;
}
