"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Home, Car, TrendingUp, ShieldAlert, DollarSign, Target, Briefcase } from "lucide-react";
import { NetWorthTrendChart } from "@/components/charts/net-worth-chart";

interface Asset {
  id: string;
  name: string;
  type: "PROPERTY" | "VEHICLE" | "INVESTMENT" | "OTHER";
  currentValue: number;
  currency: string;
  lastValuedAt: string;
}

interface Liability {
  id: string;
  name: string;
  type: "LOAN" | "CREDIT_CARD" | "MORTGAGE" | "OTHER";
  principal: number;
  currentBalance: number;
  interestRate?: number | null;
  minimumPayment?: number | null;
  dueDate?: number | null;
  currency: string;
}

interface NewAssetPayload {
  name: string;
  type: "PROPERTY" | "VEHICLE" | "INVESTMENT" | "OTHER";
  currentValue: number;
  currency: string;
}

interface NewLiabilityPayload {
  name: string;
  type: "LOAN" | "CREDIT_CARD" | "MORTGAGE" | "OTHER";
  principal: number;
  currentBalance: number;
  interestRate?: number | null;
  minimumPayment?: number | null;
  dueDate?: number | null;
  currency: string;
}

interface InvestmentHolding {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  currency: string;
  totalCost: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercent: number;
}

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  percentage: number;
  currency: string;
  deadline?: string | null;
}

export default function NetWorthPage() {
  const queryClient = useQueryClient();
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [isAddingLiability, setIsAddingLiability] = useState(false);

  // Asset Form State
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState<"PROPERTY" | "VEHICLE" | "INVESTMENT" | "OTHER">("PROPERTY");
  const [assetValue, setAssetValue] = useState("");
  const [assetCurrency, setAssetCurrency] = useState("GHS");

  // Liability Form State
  const [liabilityName, setLiabilityName] = useState("");
  const [liabilityType, setLiabilityType] = useState<"LOAN" | "CREDIT_CARD" | "MORTGAGE" | "OTHER">("LOAN");
  const [principal, setPrincipal] = useState("");
  const [currentBalance, setCurrentBalance] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [minimumPayment, setMinimumPayment] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [liabilityCurrency] = useState("GHS");

  const [error, setError] = useState<string | null>(null);

  // Queries
  const { data: dashboardData } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/summary");
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
  });

  const { data: assetsData, isLoading: isLoadingAssets } = useQuery<{ data: Asset[] }>({
    queryKey: ["assets"],
    queryFn: async () => {
      const res = await fetch("/api/assets");
      if (!res.ok) throw new Error("Failed to fetch assets");
      return res.json();
    },
  });

  const { data: liabilitiesData, isLoading: isLoadingLiabilities } = useQuery<{ data: Liability[] }>({
    queryKey: ["liabilities"],
    queryFn: async () => {
      const res = await fetch("/api/liabilities");
      if (!res.ok) throw new Error("Failed to fetch liabilities");
      return res.json();
    },
  });

  const { data: investmentsData } = useQuery<{ data: InvestmentHolding[] }>({
    queryKey: ["investments"],
    queryFn: async () => {
      const res = await fetch("/api/investments");
      if (!res.ok) throw new Error("Failed to fetch investments");
      return res.json();
    },
  });

  const { data: goalsData } = useQuery<{ data: SavingsGoal[] }>({
    queryKey: ["goals"],
    queryFn: async () => {
      const res = await fetch("/api/goals");
      if (!res.ok) throw new Error("Failed to fetch goals");
      return res.json();
    },
  });

  const { data: analyticsData } = useQuery({
    queryKey: ["spending-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/spending");
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  // Mutations
  const createAssetMutation = useMutation({
    mutationFn: async (payload: NewAssetPayload) => {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to add asset");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setIsAddingAsset(false);
      setAssetName("");
      setAssetValue("");
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete asset");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  const createLiabilityMutation = useMutation({
    mutationFn: async (payload: NewLiabilityPayload) => {
      const res = await fetch("/api/liabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to add liability");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["liabilities"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setIsAddingLiability(false);
      setLiabilityName("");
      setPrincipal("");
      setCurrentBalance("");
      setInterestRate("");
      setMinimumPayment("");
      setDueDate("");
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteLiabilityMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/liabilities/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete liability");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["liabilities"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  const handleAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAssetMutation.mutate({
      name: assetName,
      type: assetType,
      currentValue: parseFloat(assetValue) || 0,
      currency: assetCurrency,
    });
  };

  const handleLiabilitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLiabilityMutation.mutate({
      name: liabilityName,
      type: liabilityType,
      principal: parseFloat(principal) || 0,
      currentBalance: parseFloat(currentBalance) || 0,
      interestRate: interestRate ? parseFloat(interestRate) : null,
      minimumPayment: minimumPayment ? parseFloat(minimumPayment) : null,
      dueDate: dueDate ? parseInt(dueDate) : null,
      currency: liabilityCurrency,
    });
  };

  const summary = dashboardData?.data;
  const assets = assetsData?.data ?? [];
  const liabilities = liabilitiesData?.data ?? [];
  const investments = investmentsData?.data ?? [];
  const goals = goalsData?.data ?? [];
  const netWorthTrend = analyticsData?.data?.netWorthTrend ?? [];

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "PROPERTY":
        return <Home className="h-4 w-4 text-teal-600" />;
      case "VEHICLE":
        return <Car className="h-4 w-4 text-blue-600" />;
      case "INVESTMENT":
        return <TrendingUp className="h-4 w-4 text-emerald-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Net Worth & Assets</h1>
        <p className="text-sm text-muted-foreground">
          Track non-liquid assets (property, vehicles), investment holdings, savings goals, and liabilities
        </p>
      </div>

      {/* Net Worth Summary Card */}
      <Card className="border-teal-900/10 bg-gradient-to-r from-teal-950/10 via-background to-amber-950/10">
        <CardHeader className="pb-2">
          <CardDescription className="text-xs uppercase tracking-wider font-semibold text-brand-teal">
            Net Worth (Assets − Liabilities)
          </CardDescription>
          <CardTitle className="text-3xl font-extrabold md:text-4xl">
            GHS {(summary?.netWorth ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-3 gap-4 border-t pt-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Bank/Cash Balances</p>
              <p className="font-semibold">
                GHS {(summary?.totalAccountsBalance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Assets</p>
              <p className="font-semibold text-teal-600">
                +GHS {(summary?.totalAssets ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Liabilities</p>
              <p className="font-semibold text-destructive">
                -GHS {(summary?.totalLiabilities ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Net Worth Historical Trend Chart Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Net Worth Trend</CardTitle>
          <CardDescription className="text-xs">Historical daily/weekly snapshot progress</CardDescription>
        </CardHeader>
        <CardContent>
          <NetWorthTrendChart data={netWorthTrend} />
        </CardContent>
      </Card>

      {/* Assets Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Assets</h2>
            <p className="text-xs text-muted-foreground">Real estate, vehicles, and long-term investments</p>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAddingAsset(!isAddingAsset)}
            className="bg-brand-teal text-white hover:bg-brand-teal/90"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Asset
          </Button>
        </div>

        {isAddingAsset && (
          <Card className="border-teal-600/30">
            <CardHeader className="py-4">
              <CardTitle className="text-base">Add New Asset</CardTitle>
            </CardHeader>
            <form onSubmit={handleAssetSubmit}>
              <CardContent className="space-y-3 pb-4">
                {error && <p className="text-xs text-destructive">{error}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="asset-name">Asset Name</Label>
                    <Input
                      id="asset-name"
                      placeholder="e.g. East Legon Land, Toyota RAV4"
                      value={assetName}
                      onChange={(e) => setAssetName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="asset-type">Type</Label>
                    <select
                      id="asset-type"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={assetType}
                      onChange={(e) => setAssetType(e.target.value as "PROPERTY" | "VEHICLE" | "INVESTMENT" | "OTHER")}
                    >
                      <option value="PROPERTY">Property / Real Estate</option>
                      <option value="VEHICLE">Vehicle</option>
                      <option value="INVESTMENT">Investment Holding</option>
                      <option value="OTHER">Other Valuable</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="asset-value">Estimated Current Value</Label>
                    <Input
                      id="asset-value"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={assetValue}
                      onChange={(e) => setAssetValue(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="asset-currency">Currency</Label>
                    <select
                      id="asset-currency"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={assetCurrency}
                      onChange={(e) => setAssetCurrency(e.target.value)}
                    >
                      <option value="GHS">GHS</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsAddingAsset(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-brand-teal text-white">
                    Save Asset
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        )}

        {isLoadingAssets ? (
          <Card className="h-20 animate-pulse bg-muted/40" />
        ) : assets.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground border-dashed">
            No non-liquid assets tracked yet. Click &quot;Add Asset&quot; to log property, cars, or investments.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <Card key={asset.id} className="relative group">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getAssetIcon(asset.type)}
                    <span className="font-semibold text-sm">{asset.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => deleteAssetMutation.mutate(asset.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  <p className="text-xl font-bold text-teal-600 dark:text-teal-400">
                    {asset.currency} {Number(asset.currentValue).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-muted-foreground capitalize mt-1">
                    {asset.type.toLowerCase()} • Valued {new Date(asset.lastValuedAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Liabilities Section */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Liabilities</h2>
            <p className="text-xs text-muted-foreground">Bank loans, credit cards, mortgages, and IOUs</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAddingLiability(!isAddingLiability)}
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Liability
          </Button>
        </div>

        {isAddingLiability && (
          <Card className="border-destructive/30">
            <CardHeader className="py-4">
              <CardTitle className="text-base">Add New Liability</CardTitle>
            </CardHeader>
            <form onSubmit={handleLiabilitySubmit}>
              <CardContent className="space-y-3 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="liab-name">Liability Name</Label>
                    <Input
                      id="liab-name"
                      placeholder="e.g. Car Loan, Credit Card"
                      value={liabilityName}
                      onChange={(e) => setLiabilityName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="liab-type">Type</Label>
                    <select
                      id="liab-type"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={liabilityType}
                      onChange={(e) => setLiabilityType(e.target.value as "LOAN" | "CREDIT_CARD" | "MORTGAGE" | "OTHER")}
                    >
                      <option value="LOAN">Bank Loan</option>
                      <option value="CREDIT_CARD">Credit Card</option>
                      <option value="MORTGAGE">Mortgage</option>
                      <option value="OTHER">Other Debt</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="liab-principal">Original Principal</Label>
                    <Input
                      id="liab-principal"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={principal}
                      onChange={(e) => setPrincipal(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="liab-balance">Current Balance Owed</Label>
                    <Input
                      id="liab-balance"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={currentBalance}
                      onChange={(e) => setCurrentBalance(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="liab-rate">Interest Rate % (Optional)</Label>
                    <Input
                      id="liab-rate"
                      type="number"
                      step="0.1"
                      placeholder="e.g. 18.5"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="liab-min-pmt">Minimum Payment / Mo (Optional)</Label>
                    <Input
                      id="liab-min-pmt"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={minimumPayment}
                      onChange={(e) => setMinimumPayment(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsAddingLiability(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-destructive text-white hover:bg-destructive/90">
                    Save Liability
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        )}

        {isLoadingLiabilities ? (
          <Card className="h-20 animate-pulse bg-muted/40" />
        ) : liabilities.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground border-dashed">
            No liabilities or debts tracked. Click &quot;Add Liability&quot; to log credit cards or loans.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liabilities.map((liab) => (
              <Card key={liab.id} className="relative group border-destructive/20">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-destructive" />
                    <span className="font-semibold text-sm">{liab.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => deleteLiabilityMutation.mutate(liab.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  <p className="text-xl font-bold text-destructive">
                    {liab.currency} {Number(liab.currentBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-muted-foreground capitalize mt-1">
                    {liab.type.toLowerCase()}
                    {liab.interestRate ? ` • ${liab.interestRate}% APR` : ""}
                    {liab.minimumPayment ? ` • Min GHS ${liab.minimumPayment}/mo` : ""}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Investment Holdings Section */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Investment Holdings</h2>
            <p className="text-xs text-muted-foreground">Stocks, ETFs, crypto, and mutual funds gain/loss tracking</p>
          </div>
        </div>

        {investments.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground border-dashed">
            No investment holdings added yet. Log individual stocks or crypto under Investments.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {investments.map((inv) => (
              <Card key={inv.id} className="relative">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-emerald-600" />
                    <span className="font-semibold text-sm">{inv.symbol} ({inv.name})</span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  <p className="text-xl font-bold text-foreground">
                    {inv.currency} {inv.currentValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                  <div className="flex items-center justify-between text-xs mt-2 border-t pt-2">
                    <span className="text-muted-foreground">Qty: {inv.quantity} @ {inv.currentPrice}</span>
                    <span className={`font-semibold ${inv.gainLoss >= 0 ? "text-teal-600" : "text-destructive"}`}>
                      {inv.gainLoss >= 0 ? "+" : ""}{inv.gainLossPercent.toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Savings Goals Section */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Savings Goals</h2>
            <p className="text-xs text-muted-foreground">Target savings milestones and deadline progress</p>
          </div>
        </div>

        {goals.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground border-dashed">
            No active savings goals tracked yet. Set target savings amounts to monitor progress.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((goal) => (
              <Card key={goal.id}>
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-brand-teal" />
                    <span className="font-semibold text-sm">{goal.name}</span>
                  </div>
                  <Badge variant="teal">{goal.percentage}%</Badge>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>GHS {goal.currentAmount.toFixed(2)} saved</span>
                    <span>Target GHS {goal.targetAmount.toFixed(2)}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-teal transition-all duration-300"
                      style={{ width: `${goal.percentage}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
