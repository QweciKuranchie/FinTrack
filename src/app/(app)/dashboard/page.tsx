"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { SpendingCategoryChart, SpendingTrendChart } from "@/components/charts/spending-chart";

interface Account {
  id: string;
  name: string;
  type: string;
  currency: string;
  currentBalance: number;
  institution?: string;
}

interface DashboardData {
  netWorth: number;
  totalAccountsBalance: number;
  totalAssets: number;
  totalLiabilities: number;
  thisMonthSpend: number;
  thisMonthIncome?: number;
  totalSavings?: number;
  savingsProgressPct?: number;
  incomeChangePct?: number;
  expenseChangePct?: number;
  accounts: Account[];
}

interface TransactionItem {
  id: string;
  type: string;
  description?: string;
  amount: number;
  currency: string;
  date: string;
  account?: { name: string };
  category?: { name: string };
}

type TimeFilterOption = "ALL" | "THIS_MONTH" | "LAST_MONTH" | "LAST_7_DAYS" | "TODAY";
type SortOption = "NEWEST" | "OLDEST" | "AMOUNT_HIGH" | "AMOUNT_LOW";

export default function DashboardPage() {
  // Time filter & sorting state
  const [timeFilter, setTimeFilter] = useState<TimeFilterOption>("THIS_MONTH");
  const [sortBy, setSortBy] = useState<SortOption>("NEWEST");

  const { data: dashboardData, isLoading } = useQuery<{ data: DashboardData }>({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/summary");
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
  });

  const { data: recentTxns } = useQuery({
    queryKey: ["recent-transactions"],
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

  const summary = dashboardData?.data;
  const analytics = spendingAnalytics?.data;
  const allTxns: TransactionItem[] = recentTxns?.data ?? [];

  // Filter transactions according to selected time range
  const filteredTxns = allTxns.filter((txn) => {
    const txnDate = new Date(txn.date);
    const now = new Date();

    if (timeFilter === "TODAY") {
      return (
        txnDate.getDate() === now.getDate() &&
        txnDate.getMonth() === now.getMonth() &&
        txnDate.getFullYear() === now.getFullYear()
      );
    }

    if (timeFilter === "LAST_7_DAYS") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return txnDate >= sevenDaysAgo;
    }

    if (timeFilter === "THIS_MONTH") {
      return (
        txnDate.getMonth() === now.getMonth() &&
        txnDate.getFullYear() === now.getFullYear()
      );
    }

    if (timeFilter === "LAST_MONTH") {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return (
        txnDate.getMonth() === lastMonth.getMonth() &&
        txnDate.getFullYear() === lastMonth.getFullYear()
      );
    }

    // "ALL"
    return true;
  });

  // Sort transactions according to selected sorting option
  const sortedTxns = [...filteredTxns].sort((a, b) => {
    if (sortBy === "NEWEST") {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    if (sortBy === "OLDEST") {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    if (sortBy === "AMOUNT_HIGH") {
      return Number(b.amount) - Number(a.amount);
    }
    if (sortBy === "AMOUNT_LOW") {
      return Number(a.amount) - Number(b.amount);
    }
    return 0;
  });

  // Calculate filtered spending and income totals
  const filteredSpent = filteredTxns
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const filteredIncome = filteredTxns
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const expenseRatio = filteredIncome > 0
    ? Math.min(Math.round((filteredSpent / filteredIncome) * 100), 100)
    : filteredSpent > 0 ? 100 : 0;

  return (
    <div className="space-y-6">
      {/* Dashboard Top Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your total net worth, spending analytics, and balances
          </p>
        </div>

        {/* Right Header Action Controls: Time Range & Sorting Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Dashboard Date Filter Dropdown */}
          <div className="flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-xs font-medium shadow-xs">
            <Filter className="h-3.5 w-3.5 text-brand-teal" />
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeFilterOption)}
              className="bg-transparent text-xs font-semibold cursor-pointer outline-hidden focus:ring-0"
              aria-label="Dashboard time filter"
            >
              <option value="THIS_MONTH">This month</option>
              <option value="TODAY">Today</option>
              <option value="LAST_7_DAYS">Last 7 days</option>
              <option value="LAST_MONTH">Last month</option>
              <option value="ALL">All</option>
            </select>
          </div>

          {/* Dashboard Transaction Sorting Dropdown */}
          <div className="flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-xs font-medium shadow-xs">
            <ArrowUpDown className="h-3.5 w-3.5 text-brand-teal" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-xs font-semibold cursor-pointer outline-hidden focus:ring-0"
              aria-label="Dashboard transaction sorting"
            >
              <option value="NEWEST">Newest Date</option>
              <option value="OLDEST">Oldest Date</option>
              <option value="AMOUNT_HIGH">Highest Amount</option>
              <option value="AMOUNT_LOW">Lowest Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hero Net Worth Card */}
      <Card className="border-teal-900/10 bg-gradient-to-br from-teal-900/5 via-background to-amber-900/5 dark:from-teal-950/20 dark:to-background">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold text-brand-teal dark:text-teal-400">
              Total Net Worth
            </CardDescription>
            <Badge variant="outline" className="text-[10px]">
              <Calendar className="h-3 w-3 mr-1" />
              {timeFilter === "THIS_MONTH"
                ? "This Month"
                : timeFilter === "TODAY"
                ? "Today"
                : timeFilter === "LAST_7_DAYS"
                ? "Last 7 Days"
                : timeFilter === "LAST_MONTH"
                ? "Last Month"
                : "All Time"}
            </Badge>
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight md:text-4xl">
            {isLoading ? (
              <span className="text-muted-foreground animate-pulse">GHS ---</span>
            ) : (
              `GHS ${(summary?.netWorth ?? 0).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm border-t pt-4">
            <div>
              <p className="text-xs text-muted-foreground">Liquid Accounts</p>
              <p className="font-semibold text-foreground">
                GHS {(summary?.totalAccountsBalance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Other Assets</p>
              <p className="font-semibold text-teal-600 dark:text-teal-400">
                +GHS {(summary?.totalAssets ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Liabilities</p>
              <p className="font-semibold text-destructive">
                -GHS {(summary?.totalLiabilities ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2x2 Metric Sparkline & Progress Grid matching reference screenshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: BALANCE */}
        <Card className="bg-card/90 border border-border p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
                BALANCE
              </p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-foreground">
                GHS {(summary?.totalAccountsBalance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}
              </h3>
              <span className="inline-flex items-center text-xs font-semibold text-teal-600 dark:text-teal-400 mt-1">
                ↑ +2.4%
              </span>
            </div>
            {/* Red/Teal Gradient Wave Sparkline */}
            <div className="w-24 h-12">
              <svg viewBox="0 0 100 40" className="w-full h-full">
                <defs>
                  <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 30 Q 25 10, 50 25 T 100 5 L 100 40 L 0 40 Z"
                  fill="url(#balanceGrad)"
                />
                <path
                  d="M 0 30 Q 25 10, 50 25 T 100 5"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </Card>

        {/* Card 2: SAVINGS TRACKER */}
        <Card className="bg-card/90 border border-border p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
                SAVINGS TRACKER
              </p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-foreground">
                GHS {(summary?.totalSavings ?? summary?.totalAssets ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}
              </h3>
              <span className="inline-flex items-center text-xs font-semibold text-teal-600 dark:text-teal-400 mt-1">
                {summary?.savingsProgressPct ?? 0}% Achieved Target
              </span>
            </div>
            {/* Vertical Pill Bar Progress Graphic */}
            <div className="w-12 h-14 flex items-end justify-center">
              <div className="w-3.5 h-12 bg-muted/60 rounded-full overflow-hidden flex items-end p-0.5">
                <div
                  className="w-full bg-teal-500 rounded-full transition-all duration-300"
                  style={{ height: `${Math.max(10, summary?.savingsProgressPct ?? 50)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Card 3: INCOME */}
        <Card className="bg-card/90 border border-border p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
                INCOME
              </p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-foreground">
                GHS {(summary?.thisMonthIncome ?? filteredIncome ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}
              </h3>
              <span className={`inline-flex items-center text-xs font-semibold mt-1 ${(summary?.incomeChangePct ?? 0) >= 0 ? "text-teal-600 dark:text-teal-400" : "text-destructive"}`}>
                {(summary?.incomeChangePct ?? 0) >= 0 ? "↑ +" : "↓ "}{summary?.incomeChangePct ?? 0}% vs Last Month
              </span>
            </div>
            {/* Green Smooth Mini Sparkline Curve */}
            <div className="w-24 h-12">
              <svg viewBox="0 0 100 40" className="w-full h-full">
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 35 Q 30 30, 60 20 T 100 10 L 100 40 L 0 40 Z"
                  fill="url(#incomeGrad)"
                />
                <path
                  d="M 0 35 Q 30 30, 60 20 T 100 10"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </Card>

        {/* Card 4: EXPENSES */}
        <Card className="bg-card/90 border border-border p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
                EXPENSES
              </p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-foreground">
                GHS {filteredSpent.toLocaleString("en-US", { minimumFractionDigits: 0 })}
              </h3>
              <span className="inline-flex items-center text-xs font-semibold text-teal-600 dark:text-teal-400 mt-1">
                ↓ -4.2%
              </span>
            </div>
            {/* Circular Donut Radial Progress Ring */}
            <div className="relative flex items-center justify-center w-14 h-14">
              <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  className="text-muted/40"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#0D9488"
                  strokeWidth="3.5"
                  strokeDasharray={`${expenseRatio}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[11px] font-bold text-foreground">
                {expenseRatio}%
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtered Spending Strip */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                Spent (
                {timeFilter === "THIS_MONTH"
                  ? "This Month"
                  : timeFilter === "TODAY"
                  ? "Today"
                  : timeFilter === "LAST_7_DAYS"
                  ? "Last 7 Days"
                  : timeFilter === "LAST_MONTH"
                  ? "Last Month"
                  : "All Time"}
                )
              </p>
              <p className="text-lg font-bold text-foreground">
                GHS {filteredSpent.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <Link href="/budgets">
            <Button variant="outline" size="sm">
              View Budget
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Spending Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Spending by Category</CardTitle>
            <CardDescription className="text-xs">Category breakdown for recent expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <SpendingCategoryChart categoryData={analytics?.byCategory ?? []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">6-Month Spending Trend</CardTitle>
            <CardDescription className="text-xs">Monthly expense totals over time</CardDescription>
          </CardHeader>
          <CardContent>
            <SpendingTrendChart monthlyData={analytics?.monthlyTrend ?? []} />
          </CardContent>
        </Card>
      </div>

      {/* Account Balances Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold tracking-tight">Account Balances</h2>
          <Link href="/accounts" className="text-xs text-brand-teal font-medium hover:underline">
            Manage Accounts →
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-28 animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : summary?.accounts?.length === 0 ? (
          <Card className="p-6 text-center border-dashed">
            <p className="text-sm text-muted-foreground mb-4">No accounts created yet.</p>
            <Link href="/accounts">
              <Button className="bg-brand-teal text-white">Create Your First Account</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary?.accounts?.map((account) => (
              <Card key={account.id} className="hover:border-brand-teal/40 transition-colors">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                  <span className="font-semibold text-sm truncate">{account.name}</span>
                  <Badge variant="teal">{account.currency}</Badge>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  <p className="text-xl font-bold tracking-tight">
                    {account.currency} {account.currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize mt-1">
                    {account.type.replace("_", " ").toLowerCase()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Filtered Recent Transactions List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Recent Transactions</h2>
            <Badge variant="outline" className="text-[10px]">
              {sortedTxns.length} items
            </Badge>
          </div>
          <Link href="/transactions" className="text-xs text-brand-teal font-medium hover:underline">
            View All →
          </Link>
        </div>

        <Card>
          <CardContent className="p-0 divide-y">
            {sortedTxns.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No transactions found for the selected time range ({timeFilter.replace("_", " ").toLowerCase()}).
              </p>
            ) : (
              sortedTxns.slice(0, 8).map((txn: TransactionItem) => (
                <div key={txn.id} className="p-4 flex items-center justify-between hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${
                        txn.type === "INCOME"
                          ? "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                          : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                      }`}
                    >
                      {txn.type === "INCOME" ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">
                        {txn.description || txn.category?.name || "Transaction"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {txn.account?.name} • {new Date(txn.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`font-semibold text-sm ${
                      txn.type === "INCOME" ? "text-teal-600 dark:text-teal-400" : "text-foreground"
                    }`}
                  >
                    {txn.type === "INCOME" ? "+" : "-"}
                    {txn.currency} {Number(txn.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
