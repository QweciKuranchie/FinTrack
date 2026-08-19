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
  AlertCircle,
  Landmark,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface DBLiability {
  id: string;
  name: string;
  counterparty?: string;
  isReceivable: boolean;
  type: string;
  principal: number;
  currentBalance: number;
  interestRate?: number;
  minimumPayment?: number;
  dueDate?: number;
  currency: string;
  notes?: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export default function LiabilitiesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 10;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [type, setType] = useState<"LOAN" | "CREDIT_CARD" | "MORTGAGE" | "OTHER">("LOAN");
  const [principal, setPrincipal] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("GHS");

  // Fetch liabilities from database with pagination
  const { data: liabilitiesResponse, isLoading, isError } = useQuery<{
    data: DBLiability[];
    pagination?: PaginationMeta;
  }>({
    queryKey: ["liabilities", page, limit],
    queryFn: async () => {
      const res = await fetch(`/api/liabilities?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch liabilities");
      return res.json();
    },
  });

  const liabilities = liabilitiesResponse?.data ?? [];
  const pagination = liabilitiesResponse?.pagination ?? { page: 1, limit: 10, totalCount: 0, totalPages: 1 };

  // Calculate Liabilities Summary
  const totalLiabilitiesBalance = liabilities.reduce(
    (sum, l) => sum + Number(l.currentBalance || 0),
    0
  );

  const totalLoans = liabilities
    .filter((l) => l.type === "LOAN")
    .reduce((sum, l) => sum + Number(l.currentBalance || 0), 0);

  const totalCreditCards = liabilities
    .filter((l) => l.type === "CREDIT_CARD")
    .reduce((sum, l) => sum + Number(l.currentBalance || 0), 0);

  // Create Liability Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/liabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create liability");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["liabilities"] });
      setIsAddModalOpen(false);
      setName("");
      setCounterparty("");
      setPrincipal("");
    },
  });

  // Delete Liability Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/liabilities/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete liability");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["liabilities"] });
    },
  });

  const handleCreateLiability = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !principal) return;

    createMutation.mutate({
      name,
      counterparty,
      isReceivable: false,
      type,
      principal: parseFloat(principal),
      currentBalance: parseFloat(principal),
      interestRate: interestRate ? parseFloat(interestRate) : null,
      dueDate: dueDate || null,
      currency,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-destructive" /> Liabilities & Debts
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage loans, credit cards, mortgages, and debt paydown strategies
          </p>
        </div>

        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Liability
        </Button>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-red-900/10 bg-red-50/50 dark:bg-red-950/20 hover:border-red-500/40 transition-colors">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
              Total Liabilities
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
              <AlertCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-2xl font-extrabold tracking-tight text-destructive">
              GHS {totalLiabilitiesBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total outstanding balances</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Bank Loans & Mortgages
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted border">
              <Landmark className="h-4 w-4 text-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-2xl font-bold tracking-tight text-foreground">
              GHS {totalLoans.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Long-term debt commitments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Credit Cards
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted border">
              <CreditCard className="h-4 w-4 text-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-2xl font-bold tracking-tight text-foreground">
              GHS {totalCreditCards.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Revolving credit balances</p>
          </CardContent>
        </Card>
      </div>

      {/* Real-Time Liabilities List Card with Pagination */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Liability & Loan Holdings</CardTitle>
              <CardDescription className="text-xs">
                Real-time database liabilities with pagination
              </CardDescription>
            </div>
            <Badge variant="destructive" className="text-xs">
              {pagination.totalCount} items
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-destructive" />
              <span className="text-sm">Loading liabilities...</span>
            </div>
          ) : isError ? (
            <div className="p-6 text-center text-sm text-destructive">
              Failed to load liability records.
            </div>
          ) : liabilities.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CreditCard className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-semibold">No liabilities recorded.</p>
              <p className="text-xs mt-1">Click &quot;Add Liability&quot; to log a bank loan or credit balance.</p>
            </div>
          ) : (
            liabilities.map((item) => (
              <div key={item.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-base text-foreground">{item.name}</h4>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {item.type.replace("_", " ").toLowerCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Lender: <span className="font-semibold text-foreground">{item.counterparty || "Bank"}</span>
                    {item.interestRate && ` • Interest: ${item.interestRate}%`}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-extrabold text-base text-destructive">
                      {item.currency} {Number(item.currentBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Principal: {item.currency} {Number(item.principal).toLocaleString()}
                    </p>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Delete liability ${item.name}?`)) {
                        deleteMutation.mutate(item.id);
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
              Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total items)
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

      {/* Add Liability Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-card border p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95">
            <h3 className="text-xl font-bold mb-1">Add Liability Record</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Record bank loans, mortgages, or credit card balances
            </p>

            <form onSubmit={handleCreateLiability} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Liability Title / Loan Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Mortagage Loan or GCB Credit Card"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="counterparty">Lender / Institution Name</Label>
                <Input
                  id="counterparty"
                  placeholder="e.g. Ecobank, GCB Bank, or Barclays"
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="type">Liability Type</Label>
                  <select
                    id="type"
                    value={type}
                    onChange={(e) => setType(e.target.value as "LOAN" | "CREDIT_CARD" | "MORTGAGE" | "OTHER")}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="LOAN">Personal / Business Loan</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="MORTGAGE">Mortgage</option>
                    <option value="OTHER">Other Debt</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="GHS">GHS (₵)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="principal">Principal Amount (GHS)</Label>
                  <Input
                    id="principal"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="interestRate">Interest Rate % (Optional)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 18.5"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dueDate">Due Date (Optional)</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
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
                  {createMutation.isPending ? "Saving..." : "Save Liability"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
