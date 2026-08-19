"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Filter,
  Download,
  Percent,
} from "lucide-react";
import {
  SpendingCategoryChart,
  SpendingTrendChart,
  IncomeVsExpenseChart,
  CategoryPieChart,
} from "@/components/charts/spending-chart";

type StatisticsTimeRange = "THIS_MONTH" | "LAST_30_DAYS" | "LAST_3_MONTHS" | "LAST_6_MONTHS" | "YTD" | "ALL";

interface Transaction {
  id: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  currency: string;
  date: string;
  category?: { name: string; color?: string };
}

export default function StatisticsPage() {
  const [timeRange, setTimeRange] = useState<StatisticsTimeRange>("THIS_MONTH");

  const { data: transactionsData } = useQuery<{ data: Transaction[] }>({
    queryKey: ["transactions"],
    queryFn: async () => {
      const res = await fetch("/api/transactions");
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    },
  });

  const { data: spendingAnalytics } = useQuery({
    queryKey: ["spending-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/spending");
      if (!res.ok) throw new Error("Failed to fetch spending analytics");
      return res.json();
    },
  });

  const transactions = transactionsData?.data ?? [];
  const analytics = spendingAnalytics?.data;

  // Filter transactions based on selected time range
  const filteredTxns = transactions.filter((txn) => {
    const txnDate = new Date(txn.date);
    const now = new Date();

    if (timeRange === "THIS_MONTH") {
      return (
        txnDate.getMonth() === now.getMonth() &&
        txnDate.getFullYear() === now.getFullYear()
      );
    }

    if (timeRange === "LAST_30_DAYS") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return txnDate >= thirtyDaysAgo;
    }

    if (timeRange === "LAST_3_MONTHS") {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      return txnDate >= threeMonthsAgo;
    }

    if (timeRange === "LAST_6_MONTHS") {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);
      return txnDate >= sixMonthsAgo;
    }

    if (timeRange === "YTD") {
      return txnDate.getFullYear() === now.getFullYear();
    }

    return true; // ALL
  });

  // Calculate Metrics
  const totalIncome = filteredTxns
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpenses = filteredTxns
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const netCashflow = totalIncome - totalExpenses;

  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)) : 0;

  // Category Breakdown Table Data
  const categoryMap = new Map<string, { name: string; amount: number; count: number; color?: string }>();
  filteredTxns
    .filter((t) => t.type === "EXPENSE")
    .forEach((t) => {
      const catName = t.category?.name || "Uncategorized";
      const existing = categoryMap.get(catName) || { name: catName, amount: 0, count: 0, color: t.category?.color };
      existing.amount += Number(t.amount);
      existing.count += 1;
      categoryMap.set(catName, existing);
    });

  const categoryBreakdown = Array.from(categoryMap.values()).sort((a, b) => b.amount - a.amount);

  // Build Income vs Expense monthly comparison chart data
  const comparisonDataMap = new Map<string, { month: string; income: number; expenses: number }>();
  transactions.forEach((t) => {
    const d = new Date(t.date);
    const monthKey = d.toLocaleString("default", { month: "short", year: "2-digit" });
    const existing = comparisonDataMap.get(monthKey) || { month: monthKey, income: 0, expenses: 0 };
    if (t.type === "INCOME") existing.income += Number(t.amount);
    if (t.type === "EXPENSE") existing.expenses += Number(t.amount);
    comparisonDataMap.set(monthKey, existing);
  });

  const comparisonChartData = Array.from(comparisonDataMap.values()).slice(-6);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Financial Statistics & Analytics</h1>
          <p className="text-sm text-muted-foreground">
            In-depth analysis of income, expenses, savings rate, and category distributions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium shadow-xs">
            <Filter className="h-3.5 w-3.5 text-brand-teal" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as StatisticsTimeRange)}
              className="bg-transparent text-xs font-semibold cursor-pointer outline-hidden focus:ring-0"
            >
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_30_DAYS">Last 30 Days</option>
              <option value="LAST_3_MONTHS">Last 3 Months</option>
              <option value="LAST_6_MONTHS">Last 6 Months</option>
              <option value="YTD">Year to Date (YTD)</option>
              <option value="ALL">All Time</option>
            </select>
          </div>

          <a href="/api/export/csv" download>
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </a>
        </div>
      </div>

      {/* Top 4 Financial Metric Highlights Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <Card className="hover:border-teal-600/40 transition-colors">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase">
              Total Income
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-2xl font-bold tracking-tight text-teal-600 dark:text-teal-400">
              GHS {totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total revenue in period</p>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="hover:border-destructive/40 transition-colors">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase">
              Total Expenses
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
              <TrendingDown className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-2xl font-bold tracking-tight text-destructive">
              GHS {totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total outflows in period</p>
          </CardContent>
        </Card>

        {/* Net Cash Flow */}
        <Card className="hover:border-brand-teal/40 transition-colors">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase">
              Net Cash Flow
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <Wallet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p
              className={`text-2xl font-bold tracking-tight ${
                netCashflow >= 0 ? "text-teal-600 dark:text-teal-400" : "text-destructive"
              }`}
            >
              {netCashflow >= 0 ? "+" : ""}GHS {netCashflow.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Income minus expenses</p>
          </CardContent>
        </Card>

        {/* Savings Rate */}
        <Card className="hover:border-brand-teal/40 transition-colors">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase">
              Savings Rate
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-teal text-white">
              <Percent className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-2xl font-bold tracking-tight text-foreground">{savingsRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">Percentage of income saved</p>
          </CardContent>
        </Card>
      </div>

      {/* Primary Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expenses Bar Comparison Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Income vs Expenses (6 Months)</CardTitle>
            <CardDescription className="text-xs">
              Side-by-side comparison of monthly revenue and outflows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IncomeVsExpenseChart data={comparisonChartData} />
          </CardContent>
        </Card>

        {/* Category Expense Distribution Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Expense Distribution</CardTitle>
            <CardDescription className="text-xs">
              Share of expenses by category breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={analytics?.byCategory ?? []} />
          </CardContent>
        </Card>
      </div>

      {/* Secondary Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Category Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Category Spend Totals</CardTitle>
            <CardDescription className="text-xs">Ranked expense totals by category</CardDescription>
          </CardHeader>
          <CardContent>
            <SpendingCategoryChart categoryData={analytics?.byCategory ?? []} />
          </CardContent>
        </Card>

        {/* Spending Trend Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">6-Month Spending Trend</CardTitle>
            <CardDescription className="text-xs">Historical expense trajectory over time</CardDescription>
          </CardHeader>
          <CardContent>
            <SpendingTrendChart monthlyData={analytics?.monthlyTrend ?? []} />
          </CardContent>
        </Card>
      </div>

      {/* Category Deep-Dive Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Category Breakdown Table</CardTitle>
          <CardDescription className="text-xs">
            Detailed breakdown of expenses by category in selected period
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 divide-y">
          {categoryBreakdown.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No expense categories recorded for this time period.
            </div>
          ) : (
            categoryBreakdown.map((cat) => {
              const percentage = totalExpenses > 0 ? ((cat.amount / totalExpenses) * 100).toFixed(1) : "0.0";
              const avgSize = cat.count > 0 ? (cat.amount / cat.count).toFixed(2) : "0.00";

              return (
                <div key={cat.name} className="p-4 flex items-center justify-between hover:bg-muted/30 text-xs">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-3.5 w-3.5 rounded-full"
                      style={{ backgroundColor: cat.color || "#0F766E" }}
                    />
                    <div>
                      <p className="font-semibold text-sm text-foreground">{cat.name}</p>
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        {cat.count} transactions • Avg GHS {avgSize}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-sm text-foreground">
                      GHS {cat.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                    <Badge variant="outline" className="text-[10px] mt-0.5">
                      {percentage}% of total
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
