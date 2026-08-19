"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  ArrowRightLeft,
  CheckCircle2,
  Loader2,
  Clock,
} from "lucide-react";
import { convertCurrency } from "@/lib/fx";

interface FxRateRecord {
  id: string;
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  fetchedAt: string;
}

const SUPPORTED_CURRENCIES = [
  { code: "GHS", symbol: "₵", name: "Ghanaian Cedi" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
];

export default function FxCurrenciesPage() {
  const queryClient = useQueryClient();

  // Converter Form State
  const [amount, setAmount] = useState<string>("100");
  const [fromCurrency, setFromCurrency] = useState<string>("USD");
  const [toCurrency, setToCurrency] = useState<string>("GHS");

  // Fetch real-time FX rates from database
  const { data: fxResponse, isLoading, isError } = useQuery<{ data: FxRateRecord[] }>({
    queryKey: ["fx-rates"],
    queryFn: async () => {
      const res = await fetch("/api/fx/rates");
      if (!res.ok) throw new Error("Failed to fetch FX rates");
      return res.json();
    },
  });

  const fxRates = fxResponse?.data ?? [];

  // Build rateMap for convertCurrency helper
  const rateMap: Record<string, number> = {
    GHS_GHS: 1,
    USD_USD: 1,
    EUR_EUR: 1,
    GBP_GBP: 1,
  };

  fxRates.forEach((r) => {
    rateMap[`${r.baseCurrency}_${r.targetCurrency}`] = Number(r.rate);
  });

  // Default fallback rates if database is empty
  if (!rateMap["USD_GHS"]) rateMap["USD_GHS"] = 15.5;
  if (!rateMap["EUR_GHS"]) rateMap["EUR_GHS"] = 16.8;
  if (!rateMap["GBP_GHS"]) rateMap["GBP_GHS"] = 19.8;
  if (!rateMap["NGN_GHS"]) rateMap["NGN_GHS"] = 0.01;
  if (!rateMap["KES_GHS"]) rateMap["KES_GHS"] = 0.12;
  if (!rateMap["CAD_GHS"]) rateMap["CAD_GHS"] = 11.2;

  // Refresh FX Rates Mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/cron/fx-refresh", { method: "POST" });
      if (!res.ok) throw new Error("Failed to refresh FX rates");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fx-rates"] });
    },
  });

  // Calculate Currency Conversion
  const inputNum = parseFloat(amount) || 0;
  const convertedDecimal = convertCurrency(inputNum, fromCurrency, toCurrency, rateMap);
  const convertedResult = convertedDecimal.toNumber();

  const singleUnitDecimal = convertCurrency(1, fromCurrency, toCurrency, rateMap);
  const singleUnitRate = singleUnitDecimal.toNumber();

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <RefreshCw className="h-7 w-7 text-brand-teal" /> FX & Foreign Currencies
          </h1>
          <p className="text-sm text-muted-foreground">
            Live currency converter calculator and automated exchange rate engine status
          </p>
        </div>

        <Button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="bg-brand-teal text-white hover:bg-brand-teal/90 shadow-sm"
        >
          {refreshMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh Rates
            </>
          )}
        </Button>
      </div>

      {/* Interactive Currency Converter Calculator */}
      <Card className="border-teal-900/20 shadow-md bg-gradient-to-br from-teal-950/10 via-card to-amber-950/10">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-teal text-white">
                <ArrowRightLeft className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Live Currency Converter</CardTitle>
                <CardDescription className="text-xs">
                  Instant multi-currency conversion with real-time rates
                </CardDescription>
              </div>
            </div>
            <Badge variant="teal" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Live Engine
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-4 items-end">
            {/* Amount */}
            <div className="sm:col-span-3 space-y-1.5">
              <Label htmlFor="amount">Amount to Convert</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="100.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg font-bold"
              />
            </div>

            {/* From Currency */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="fromCurrency">From</Label>
              <select
                id="fromCurrency"
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <div className="sm:col-span-2 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSwapCurrencies}
                className="h-10 px-3 flex-1 gap-2 border-brand-teal/40 text-brand-teal hover:bg-brand-teal/10"
                title="Swap currencies"
              >
                <ArrowRightLeft className="h-4 w-4" /> Swap
              </Button>

              {/* To Currency */}
              <select
                id="toCurrency"
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conversion Output Display */}
          <div className="rounded-2xl bg-card border border-teal-900/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Converted Equivalent ({toCurrency})
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-teal-600 dark:text-teal-400 mt-1">
                {toCurrency}{" "}
                {convertedResult.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </h2>
            </div>

            <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0">
              <Badge variant="outline" className="text-xs font-semibold">
                Exchange Rate
              </Badge>
              <p className="text-sm font-bold text-foreground mt-1">
                1 {fromCurrency} = {singleUnitRate.toFixed(4)} {toCurrency}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Automated rate calculated via FinTrack FX Cache
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exchange Rate Engine Cache Table */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Exchange Rate Engine Cache</CardTitle>
              <CardDescription className="text-xs">
                Real-time rate table cached in database
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1 text-brand-teal" /> Updated Regularly
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-brand-teal" />
              <span className="text-sm">Loading rate table...</span>
            </div>
          ) : isError ? (
            <div className="p-6 text-center text-sm text-destructive">
              Failed to load FX rate cache.
            </div>
          ) : fxRates.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No FX rate records found in database. Click &quot;Refresh Rates&quot; to fetch latest exchange rates.
            </div>
          ) : (
            fxRates.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-bold text-xs">
                    {r.baseCurrency}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">
                      {r.baseCurrency} → {r.targetCurrency}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      Fetched {new Date(r.fetchedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-extrabold text-sm text-teal-600 dark:text-teal-400">
                    1 {r.baseCurrency} = {Number(r.rate).toFixed(4)} {r.targetCurrency}
                  </p>
                  <Badge variant="secondary" className="text-[10px] mt-0.5">
                    Active Cache
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Supported Base Currencies Portfolio Card */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-bold">Supported Base Currencies</CardTitle>
          <CardDescription className="text-xs">
            Currencies supported for account balances, multi-currency reporting, and PDF exports
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SUPPORTED_CURRENCIES.slice(0, 4).map((c) => (
              <div key={c.code} className="p-4 rounded-xl bg-card border flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-teal/15 text-brand-teal font-extrabold text-lg">
                  {c.symbol}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">{c.name}</h4>
                  <p className="text-xs text-muted-foreground font-semibold">{c.code}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
