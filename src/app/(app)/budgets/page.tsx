"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, PieChart, AlertTriangle, CheckCircle2 } from "lucide-react";

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

  const getProgressColor = (percentage: number) => {
    if (percentage > 100) return "bg-red-500";
    if (percentage >= 70) return "bg-amber-500";
    return "bg-teal-600";
  };

  const getBadgeVariant = (percentage: number) => {
    if (percentage > 100) return "destructive" as const;
    if (percentage >= 70) return "amber" as const;
    return "teal" as const;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Monthly Budgets</h1>
          <p className="text-sm text-muted-foreground">
            Set category limits for this month and monitor spending progress
          </p>
        </div>
        <Button
          onClick={() => setIsSettingBudget(!isSettingBudget)}
          className="bg-brand-teal text-white hover:bg-brand-teal/90 shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" /> Set Category Budget
        </Button>
      </div>

      {isSettingBudget && (
        <Card className="border-brand-teal/30">
          <CardHeader>
            <CardTitle className="text-base">Set Monthly Budget</CardTitle>
            <CardDescription>Target maximum spend for a category this month</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-3">
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="budget-cat">Category</Label>
                  <select
                    id="budget-cat"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Expense Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="budget-amt">Monthly Limit (GHS)</Label>
                  <Input
                    id="budget-amt"
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
                  Save Budget
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-32 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-brand-teal mb-3">
            <PieChart className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No Category Budgets Set</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Set budget limits for categories like Food, Transport, or Utilities to track spend.
          </p>
          <Button onClick={() => setIsSettingBudget(true)} className="bg-brand-teal text-white">
            Set Your First Budget
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((item) => (
            <Card key={item.id} className="hover:border-brand-teal/30 transition-colors">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold">{item.categoryName}</CardTitle>
                <Badge variant={getBadgeVariant(item.percentage)}>{item.percentage}%</Badge>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Spent: <strong className="text-foreground">GHS {item.spentAmount.toFixed(2)}</strong>
                  </span>
                  <span className="text-muted-foreground">Budget: GHS {item.budgetAmount.toFixed(2)}</span>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getProgressColor(item.percentage)}`}
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  />
                </div>

                <div className="flex items-center gap-1 text-[11px]">
                  {item.percentage > 100 ? (
                    <span className="text-destructive font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Over budget by GHS{" "}
                      {(item.spentAmount - item.budgetAmount).toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-teal-600 dark:text-teal-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> GHS{" "}
                      {(item.budgetAmount - item.spentAmount).toFixed(2)} remaining
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
