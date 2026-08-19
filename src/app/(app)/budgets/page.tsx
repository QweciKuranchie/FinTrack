"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Wallet, AlertTriangle, CheckCircle2, PieChart } from "lucide-react";

interface Category {
  id: string;
  name: string;
  type: string;
}

interface BudgetSummaryItem {
  id: string;
  categoryId: string;
  categoryName: string;
  budgetAmount: number;
  spentAmount: number;
  percentage: number;
  currency: string;
}

interface SetBudgetPayload {
  categoryId: string;
  amount: number;
  currency: string;
}

export default function BudgetsPage() {
  const queryClient = useQueryClient();
  const [isSettingBudget, setIsSettingBudget] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: categoriesData } = useQuery<{ data: Category[] }>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const { data: budgetsData, isLoading } = useQuery<{ data: BudgetSummaryItem[] }>({
    queryKey: ["budgets"],
    queryFn: async () => {
      const res = await fetch("/api/budgets");
      if (!res.ok) throw new Error("Failed to fetch budgets");
      return res.json();
    },
  });

  const setBudgetMutation = useMutation({
    mutationFn: async (payload: SetBudgetPayload) => {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to set budget");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      setIsSettingBudget(false);
      setAmount("");
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      setError("Please select a category");
      return;
    }
    setBudgetMutation.mutate({
      categoryId,
      amount: parseFloat(amount) || 0,
      currency: "GHS",
    });
  };

  const categories = (categoriesData?.data ?? []).filter((c) => c.type === "EXPENSE");
  const budgets = budgetsData?.data ?? [];

  // Calculate Budget Overview Totals
  const totalBudgeted = budgets.reduce((sum, b) => sum + Number(b.budgetAmount || 0), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + Number(b.spentAmount || 0), 0);
  const remainingBudget = totalBudgeted - totalSpent;
  const overallBurnPct = totalBudgeted > 0 ? Math.min(100, Math.round((totalSpent / totalBudgeted) * 100)) : 0;

  const getProgressColor = (percentage: number) => {
    if (percentage > 100) return "bg-red-500";
    if (percentage >= 70) return "bg-amber-500";
    return "bg-teal-600";
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <Wallet className="h-7 w-7 text-brand-teal" /> Category Budgets
          </h1>
          <p className="text-sm text-muted-foreground">
            Set monthly spending limits by category and track burn rates in real time
          </p>
        </div>

        <Button
          onClick={() => setIsSettingBudget(!isSettingBudget)}
          className="bg-brand-teal text-white hover:bg-brand-teal/90 shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" /> Set Category Budget
        </Button>
      </div>

      {/* Budget Overview Hero Section */}
      <Card className="border-teal-900/10 bg-gradient-to-r from-teal-950/10 via-card to-amber-950/10 shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-teal text-white">
                <PieChart className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Budget Overview</CardTitle>
                <CardDescription className="text-xs">
                  Monthly allocation summary across all categories
                </CardDescription>
              </div>
            </div>
            <Badge variant={overallBurnPct >= 100 ? "destructive" : "teal"}>
              {overallBurnPct}% Burn Rate
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Budgeted</p>
              <p className="text-2xl font-extrabold text-foreground mt-0.5">
                GHS {totalBudgeted.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">Monthly allocation sum</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Spent</p>
              <p className="text-2xl font-extrabold text-destructive mt-0.5">
                GHS {totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">Category outgoings</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Remaining Budget</p>
              <p className={`text-2xl font-extrabold mt-0.5 ${remainingBudget >= 0 ? "text-teal-600 dark:text-teal-400" : "text-destructive"}`}>
                GHS {remainingBudget.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">Unspent monthly allowance</p>
            </div>
          </div>

          {/* Overall Burn Rate Progress Bar */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>Overall Monthly Budget Progress</span>
              <span>{overallBurnPct}% Used</span>
            </div>
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getProgressColor(overallBurnPct)}`}
                style={{ width: `${overallBurnPct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Set Budget Form Modal Card */}
      {isSettingBudget && (
        <Card className="border-brand-teal/40">
          <CardHeader className="py-4">
            <CardTitle className="text-base">Set Monthly Category Limit</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-3 pb-4">
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                  >
                    <option value="">Select Expense Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="budget-amount">Monthly Budget Amount (GHS)</Label>
                  <Input
                    id="budget-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsSettingBudget(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-brand-teal text-white">
                  {setBudgetMutation.isPending ? "Saving..." : "Save Budget"}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* Category Budgets Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-32 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground border-dashed">
          <Wallet className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
          <p className="font-semibold">No category budgets set for this month.</p>
          <p className="text-xs mt-1">Click &quot;Set Category Budget&quot; to assign monthly limits.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b) => {
            const isOver = b.percentage > 100;
            const remaining = b.budgetAmount - b.spentAmount;

            return (
              <Card key={b.id} className={`relative ${isOver ? "border-red-500/40" : ""}`}>
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isOver ? (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-teal-600" />
                    )}
                    <span className="font-semibold text-sm">{b.categoryName}</span>
                  </div>
                  <Badge variant={isOver ? "destructive" : "teal"} className="text-[10px]">
                    {b.percentage}%
                  </Badge>
                </CardHeader>

                <CardContent className="p-4 pt-1 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      Spent: {b.currency} {b.spentAmount.toFixed(2)}
                    </span>
                    <span className="font-medium">
                      Budget: {b.currency} {b.budgetAmount.toFixed(2)}
                    </span>
                  </div>

                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${getProgressColor(b.percentage)}`}
                      style={{ width: `${Math.min(100, b.percentage)}%` }}
                    />
                  </div>

                  <p className={`text-[11px] font-medium mt-1 ${remaining < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {remaining < 0
                      ? `Over budget by ${b.currency} ${Math.abs(remaining).toFixed(2)}`
                      : `${b.currency} ${remaining.toFixed(2)} remaining`}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
