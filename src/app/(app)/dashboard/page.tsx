"use client";

import { useQuery } from "@tanstack/react-query";
import { CreditCard, Plus, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useState } from "react";
import { QuickTransactionModal } from "@/components/transactions/quick-transaction-modal";

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

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: dashboardData, isLoading, refetch } = useQuery<{ data: DashboardData }>({
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

  const summary = dashboardData?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your total net worth and account balances
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-teal text-white hover:bg-brand-teal/90 shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" /> Log Transaction
        </Button>
      </div>

      {/* Hero Net Worth Card */}
      <Card className="border-teal-900/10 bg-gradient-to-br from-teal-900/5 via-background to-amber-900/5 dark:from-teal-950/20 dark:to-background">
        <CardHeader className="pb-2">
          <CardDescription className="text-xs uppercase tracking-wider font-semibold text-brand-teal dark:text-teal-400">
            Total Net Worth
          </CardDescription>
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

      {/* This Month Spending Strip */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Spent This Month</p>
              <p className="text-lg font-bold text-foreground">
                GHS {(summary?.thisMonthSpend ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
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

      {/* Recent Transactions List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold tracking-tight">Recent Transactions</h2>
          <Link href="/transactions" className="text-xs text-brand-teal font-medium hover:underline">
            View All →
          </Link>
        </div>

        <Card>
          <CardContent className="p-0 divide-y">
            {recentTxns?.data?.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No transactions recorded yet. Click &quot;Log Transaction&quot; to add one.
              </p>
            ) : (
              recentTxns?.data?.slice(0, 5).map((txn: TransactionItem) => (
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

      {/* Quick Add Modal */}
      <QuickTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => refetch()}
        accounts={summary?.accounts ?? []}
      />
    </div>
  );
}
