"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Plus,
  Trash2,
  Filter,
  ArrowDownRight,
  TrendingDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  DollarSign,
} from "lucide-react";

interface DBTransaction {
  id: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  currency: string;
  category?: { name: string; color?: string } | null;
  account?: { name: string } | null;
  description?: string | null;
  payee?: string | null;
  transactionDate: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 10;
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Add Expense Form State
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [payee, setPayee] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");

  // Fetch real-time transactions from API (filtering expenses)
  const { data: txResponse, isLoading, isError } = useQuery<{
    data: DBTransaction[];
    pagination?: PaginationMeta;
  }>({
    queryKey: ["transactions-expenses", page, limit, selectedCategory],
    queryFn: async () => {
      const catParam = selectedCategory !== "ALL" ? `&category=${encodeURIComponent(selectedCategory)}` : "";
      const res = await fetch(`/api/transactions?type=EXPENSE&page=${page}&limit=${limit}${catParam}`);
      if (!res.ok) throw new Error("Failed to fetch expense transactions");
      return res.json();
    },
  });

  // Fetch categories for filter & modal dropdown
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  // Fetch accounts for modal dropdown
  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      return res.json();
    },
  });

  const rawExpenses = txResponse?.data ?? [];
  const pagination = txResponse?.pagination ?? { page: 1, limit: 10, totalCount: 0, totalPages: 1 };
  const categories = categoriesData?.data ?? [];
  const accounts = accountsData?.data ?? [];

  // Filter only EXPENSE items
  const expenses = rawExpenses.filter((t) => t.type === "EXPENSE");

  // Calculate Real-Time Totals
  const totalExpenseSum = expenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const avgExpense = expenses.length > 0 ? totalExpenseSum / expenses.length : 0;

  // Create Expense Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, type: "EXPENSE" }),
      });
      if (!res.ok) throw new Error("Failed to log expense");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setIsAddModalOpen(false);
      setAmount("");
      setDescription("");
      setPayee("");
    },
  });

  // Delete Expense Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete expense");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    createMutation.mutate({
      amount: parseFloat(amount),
      description: description || "Expense",
      payee: payee || null,
      categoryId: categoryId || (categories[0]?.id ?? null),
      accountId: accountId || (accounts[0]?.id ?? null),
      currency: "GHS",
      transactionDate: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <ArrowDownRight className="h-7 w-7 text-destructive" /> Expense Tracker
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor real-time expenses, category spend distributions, and receipts
          </p>
        </div>

        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" /> Log Expense
        </Button>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-red-900/10 bg-red-50/50 dark:bg-red-950/20 hover:border-red-500/40 transition-colors">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
              Total Expenses Spent
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
              <TrendingDown className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-2xl font-extrabold tracking-tight text-destructive">
              GHS {totalExpenseSum.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total outgoings in current view</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Average Expense Ticket
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted border">
              <DollarSign className="h-4 w-4 text-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-2xl font-bold tracking-tight text-foreground">
              GHS {avgExpense.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Average transaction size</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Expense Transactions Count
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted border">
              <CreditCard className="h-4 w-4 text-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-2xl font-bold tracking-tight text-foreground">{pagination.totalCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Recorded expense items</p>
          </CardContent>
        </Card>
      </div>

      {/* Real-Time Expenses List Card with Pagination */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold">Expense Log</CardTitle>
              <CardDescription className="text-xs">
                Real-time database expense items with pagination
              </CardDescription>
            </div>

            {/* Category Filter Dropdown */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="h-8 rounded-lg border border-input bg-background px-3 text-xs font-medium"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c: { id: string; name: string }) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-destructive" />
              <span className="text-sm">Loading expenses...</span>
            </div>
          ) : isError ? (
            <div className="p-6 text-center text-sm text-destructive">
              Failed to load expense records.
            </div>
          ) : expenses.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CreditCard className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-semibold">No expense records found.</p>
              <p className="text-xs mt-1">Click &quot;Log Expense&quot; to add your first expense entry.</p>
            </div>
          ) : (
            expenses.map((tx) => (
              <div key={tx.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 font-bold text-xs">
                    <ArrowDownRight className="h-5 w-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-foreground">
                        {tx.description || tx.payee || "Expense Transaction"}
                      </h4>
                      <Badge variant="outline" className="text-[10px]">
                        {tx.category?.name || "General"}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground mt-0.5">
                      {tx.account?.name ? `Account: ${tx.account.name} • ` : ""}
                      <span className="flex-inline items-center gap-1">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {new Date(tx.transactionDate).toLocaleDateString()}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-extrabold text-base text-destructive">
                      -GHS {Number(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Delete this expense record?")) {
                        deleteMutation.mutate(tx.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total expenses)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="h-8 gap-1"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-card border p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95">
            <h3 className="text-xl font-bold mb-1">Log Expense</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Saved directly to your database in real time
            </p>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Expense Amount (GHS)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description / Title</Label>
                <Input
                  id="description"
                  placeholder="e.g. Groceries at Shoprite or Fuel"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payee">Merchant / Payee Name</Label>
                <Input
                  id="payee"
                  placeholder="e.g. Shell, Shoprite, or Uber"
                  value={payee}
                  onChange={(e) => setPayee(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c: { id: string; name: string }) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="account">Source Account</Label>
                  <select
                    id="account"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select Account</option>
                    {accounts.map((a: { id: string; name: string }) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Saving..." : "Save Expense"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
