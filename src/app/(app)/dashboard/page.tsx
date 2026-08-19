"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Bell,
  Sun,
  Moon,
  Calendar,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useTheme } from "next-themes";
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

export default function DashboardPage() {
  const { theme, setTheme } = useTheme();

  // Time filter state: default "THIS_MONTH"
  const [timeFilter, setTimeFilter] = useState<TimeFilterOption>("THIS_MONTH");
  const [showNotifications, setShowNotifications] = useState(false);

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

  // Calculate filtered spending total
  const filteredSpent = filteredTxns
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const notificationsList = [
    { title: "FX Rates Engine Active", desc: "Automated GHS/USD exchange rate cache updated", time: "Just now" },
    { title: "Subscription Reminders", desc: "Resend email notifications active for upcoming renewals", time: "Today" },
    { title: "RLS Security Protection", desc: "Supabase Row Level Security active for household data", time: "System" },
  ];

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

        {/* Right Header Action Controls: User Profile, Notifications, Dark/Light Toggle, Date Sorting */}
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

          {/* Dark / Light Mode Toggle Icon */}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle theme mode"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700 dark:text-slate-300" />
            )}
          </Button>

          {/* Notification Bell Icon & Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-lg relative"
              onClick={() => setShowNotifications((prev) => !prev)}
              title="Notifications"
            >
              <Bell className="h-4 w-4 text-foreground" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-brand-teal ring-2 ring-background" />
            </Button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border bg-card p-3 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between border-b pb-2 mb-2">
                  <h4 className="font-bold text-xs">Notifications & System Alerts</h4>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {notificationsList.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/50 text-xs">
                      <CheckCircle2 className="h-4 w-4 text-brand-teal shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-foreground">{item.title}</p>
                        <p className="text-muted-foreground text-[11px]">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Card */}
          <Link href="/settings">
            <Button variant="outline" className="h-9 px-3 gap-2 rounded-lg">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-teal text-white text-[10px] font-bold">
                U
              </div>
              <span className="text-xs font-semibold hidden sm:inline-block">Profile</span>
            </Button>
          </Link>
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
              {filteredTxns.length} items
            </Badge>
          </div>
          <Link href="/transactions" className="text-xs text-brand-teal font-medium hover:underline">
            View All →
          </Link>
        </div>

        <Card>
          <CardContent className="p-0 divide-y">
            {filteredTxns.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No transactions found for the selected time range ({timeFilter.replace("_", " ").toLowerCase()}).
              </p>
            ) : (
              filteredTxns.slice(0, 5).map((txn: TransactionItem) => (
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
