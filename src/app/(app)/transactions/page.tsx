"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Search,
  Upload,
  ArrowUpDown,
  Calendar,
  Wallet,
  Loader2,
} from "lucide-react";
import { QuickTransactionModal } from "@/components/transactions/quick-transaction-modal";
import { CsvImportModal } from "@/components/transactions/csv-import-modal";

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  description?: string;
  date: string;
  account: { id: string; name: string; currency: string };
  category?: { id: string; name: string; icon?: string; color?: string };
}

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [sortOrder, setSortOrder] = useState<"NEWEST" | "OLDEST">("NEWEST");

  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      return res.json();
    },
  });

  const { data: txnsData, isLoading } = useQuery<{ data: Transaction[] }>({
    queryKey: ["transactions", selectedAccount, selectedType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAccount) params.set("accountId", selectedAccount);
      if (selectedType) params.set("type", selectedType);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    },
  });

  const deleteTxnMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete transaction");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  const accounts = accountsData?.data ?? [];
  const rawTxns = txnsData?.data ?? [];

  // Filter transactions
  const filteredTxns = rawTxns.filter((txn) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      txn.description?.toLowerCase().includes(term) ||
      txn.account?.name.toLowerCase().includes(term) ||
      txn.category?.name.toLowerCase().includes(term) ||
      txn.amount.toString().includes(term)
    );
  });

  // Calculate Total Income & Total Expense
  const totalIncome = filteredTxns
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalExpense = filteredTxns
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const netCashflow = totalIncome - totalExpense;

  // Date Sorting
  const sortedTxns = [...filteredTxns].sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    return sortOrder === "NEWEST" ? timeB - timeA : timeA - timeB;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <ArrowLeftRight className="h-7 w-7 text-brand-teal" /> Transactions
          </h1>
          <p className="text-sm text-muted-foreground">
            Master ledger of all incoming incomes, outgoing expenses, and transfers
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setIsCsvModalOpen(true)}
            className="shadow-xs text-xs h-9"
          >
            <Upload className="h-4 w-4 mr-1.5" /> Import CSV
          </Button>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-teal text-white hover:bg-brand-teal/90 shadow-xs text-xs h-9"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Log Transaction
          </Button>
        </div>
      </div>

      {/* Top Summary Metrics Cards (Total Income, Total Expense, Net Cashflow) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-teal-900/10 bg-teal-50/50 dark:bg-teal-950/20">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
              Total Income
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-2xl font-extrabold tracking-tight text-teal-600 dark:text-teal-400">
              GHS {totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total incoming payments</p>
          </CardContent>
        </Card>

        <Card className="border-red-900/10 bg-red-50/50 dark:bg-red-950/20">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
              Total Expense
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-2xl font-extrabold tracking-tight text-destructive">
              GHS {totalExpense.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total outgoings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Net Cashflow
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted border">
              <Wallet className="h-4 w-4 text-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p
              className={`text-2xl font-extrabold tracking-tight ${
                netCashflow >= 0 ? "text-teal-600 dark:text-teal-400" : "text-destructive"
              }`}
            >
              {netCashflow >= 0 ? "+" : ""}GHS {netCashflow.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Income minus Expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Sorting Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Account Filter */}
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium"
          >
            <option value="">All Accounts</option>
            {accounts.map((a: { id: string; name: string }) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium"
          >
            <option value="">All Types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
            <option value="TRANSFER">Transfer</option>
          </select>

          {/* Date Sort Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "NEWEST" ? "OLDEST" : "NEWEST")}
            className="h-9 px-3 text-xs gap-1.5"
            title="Toggle Date Sort Order"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>{sortOrder === "NEWEST" ? "Newest First" : "Oldest First"}</span>
          </Button>
        </div>
      </div>

      {/* Responsive Transaction Ledger */}
      <Card>
        <CardHeader className="py-3 px-4 sm:px-6 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold">Transaction History</CardTitle>
          <Badge variant="outline" className="text-xs">
            {sortedTxns.length} records
          </Badge>
        </CardHeader>

        <CardContent className="p-0 divide-y">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-brand-teal" />
              <span className="text-sm">Loading transactions...</span>
            </div>
          ) : sortedTxns.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No transactions found matching your filters.
            </div>
          ) : (
            sortedTxns.map((txn) => {
              const isIncome = txn.type === "INCOME";
              const isExpense = txn.type === "EXPENSE";

              return (
                <div
                  key={txn.id}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                        isIncome
                          ? "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                          : isExpense
                          ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                      }`}
                    >
                      {isIncome ? (
                        <ArrowDownLeft className="h-5 w-5" />
                      ) : isExpense ? (
                        <ArrowUpRight className="h-5 w-5" />
                      ) : (
                        <ArrowLeftRight className="h-5 w-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-foreground">
                          {txn.description || "Transaction"}
                        </h4>
                        <Badge
                          variant={isIncome ? "teal" : isExpense ? "destructive" : "secondary"}
                          className="text-[10px]"
                        >
                          {txn.category?.name || txn.type}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span>Account: {txn.account?.name}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(txn.date).toLocaleDateString()}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                    <p
                      className={`font-extrabold text-base ${
                        isIncome
                          ? "text-teal-600 dark:text-teal-400"
                          : isExpense
                          ? "text-destructive"
                          : "text-foreground"
                      }`}
                    >
                      {isIncome ? "+" : isExpense ? "-" : ""}
                      {txn.currency} {Number(txn.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Delete this transaction?")) {
                          deleteTxnMutation.mutate(txn.id);
                        }
                      }}
                      disabled={deleteTxnMutation.isPending}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <QuickTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
        }}
        accounts={accounts}
      />

      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
        }}
        accounts={accounts}
      />
    </div>
  );
}
