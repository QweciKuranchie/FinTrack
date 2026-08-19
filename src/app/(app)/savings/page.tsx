"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  PiggyBank,
  Plus,
  Trash2,
  Target,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  percentage: number;
  currency: string;
  deadline?: string | null;
}

interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export default function SavingsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 10;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [currency, setCurrency] = useState("GHS");
  const [accountId, setAccountId] = useState("");

  const { data: accountsData } = useQuery<{ data: Array<{ id: string; name: string }> }>({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      return res.json();
    },
  });

  const accounts = accountsData?.data ?? [];

  // Fetch real-time savings goals from Postgres with pagination
  const { data: goalsResponse, isLoading, isError } = useQuery<{
    data: SavingsGoal[];
    pagination?: PaginationMeta;
  }>({
    queryKey: ["goals", page, limit],
    queryFn: async () => {
      const res = await fetch(`/api/goals?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch savings goals");
      return res.json();
    },
  });

  const goals = goalsResponse?.data ?? [];
  const pagination = goalsResponse?.pagination ?? { page: 1, limit: 10, totalCount: 0, totalPages: 1 };

  // Calculate Real-Time Totals
  const totalSaved = goals.reduce((sum, g) => sum + Number(g.currentAmount || 0), 0);
  const totalTarget = goals.reduce((sum, g) => sum + Number(g.targetAmount || 0), 0);
  const overallPercentage = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  // Create Goal Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      targetAmount: number;
      currentAmount: number;
      deadline?: string | null;
      currency: string;
      accountId?: string | null;
    }) => {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create savings goal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setIsAddModalOpen(false);
      setName("");
      setTargetAmount("");
      setCurrentAmount("");
      setDeadline("");
      setAccountId("");
    },
  });

  // Deposit Contribution Mutation
  const depositMutation = useMutation({
    mutationFn: async ({ id, newAmount }: { id: string; newAmount: number }) => {
      const res = await fetch(`/api/goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentAmount: newAmount }),
      });
      if (!res.ok) throw new Error("Failed to update savings goal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  // Delete Goal Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/goals/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete goal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;

    createMutation.mutate({
      name,
      targetAmount: parseFloat(targetAmount),
      currentAmount: currentAmount ? parseFloat(currentAmount) : 0,
      deadline: deadline || null,
      currency,
      accountId: accountId || null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <PiggyBank className="h-7 w-7 text-brand-teal" /> Savings & Target Goals
          </h1>
          <p className="text-sm text-muted-foreground">
            Set savings targets, emergency funds, and monitor progress in real time
          </p>
        </div>

        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-brand-teal text-white hover:bg-brand-teal/90 shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Savings Goal
        </Button>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:border-brand-teal/40 transition-colors">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Savings Accumulated
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
              <PiggyBank className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-2xl font-extrabold tracking-tight text-teal-600 dark:text-teal-400">
              GHS {totalSaved.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Saved across active goals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Target Goals Total
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <Target className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-2xl font-bold tracking-tight text-foreground">
              GHS {totalTarget.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Combined target savings goal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Overall Completion Rate
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-teal text-white">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-2xl font-bold tracking-tight text-foreground">{overallPercentage}%</p>
            <p className="text-xs text-muted-foreground mt-1">Average milestone completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Real-Time Savings Goals Grid & List */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Active Savings Goals</CardTitle>
              <CardDescription className="text-xs">
                Real-time target goals with deposit tracker & pagination
              </CardDescription>
            </div>
            <Badge variant="teal" className="text-xs">
              {pagination.totalCount} goals
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-brand-teal" />
              <span className="text-sm">Loading savings goals...</span>
            </div>
          ) : isError ? (
            <div className="p-6 text-center text-sm text-destructive">
              Failed to load savings goals.
            </div>
          ) : goals.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Target className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-semibold">No savings goals set yet.</p>
              <p className="text-xs mt-1">Click &quot;Add Savings Goal&quot; to define your emergency or purchase targets.</p>
            </div>
          ) : (
            goals.map((goal) => {
              const current = Number(goal.currentAmount || 0);
              const target = Number(goal.targetAmount || 0);
              const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
              const isCompleted = percent >= 100;

              return (
                <div key={goal.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-foreground">{goal.name}</h4>
                      <Badge variant={isCompleted ? "teal" : "outline"} className="text-[10px]">
                        {isCompleted ? "Target Achieved 🎉" : `${percent}% Complete`}
                      </Badge>
                    </div>

                    {goal.deadline && (
                      <p className="text-xs text-muted-foreground">
                        Target Deadline: <span className="font-medium text-foreground">{new Date(goal.deadline).toLocaleDateString()}</span>
                      </p>
                    )}

                    {/* Progress Bar */}
                    <div className="w-full max-w-sm pt-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                        <span>Current: {goal.currency} {current.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        <span>Target: {goal.currency} {target.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-teal transition-all duration-300 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const depositStr = prompt(`Add savings deposit to ${goal.name} (GHS):`, "100");
                        if (depositStr && !isNaN(parseFloat(depositStr))) {
                          depositMutation.mutate({ id: goal.id, newAmount: current + parseFloat(depositStr) });
                        }
                      }}
                      disabled={depositMutation.isPending}
                      className="h-8 text-xs gap-1 border-teal-500/40 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" /> + Deposit
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const withdrawStr = prompt(`Withdraw from ${goal.name} (GHS):`, "50");
                        if (withdrawStr && !isNaN(parseFloat(withdrawStr))) {
                          const withdrawAmt = parseFloat(withdrawStr);
                          if (withdrawAmt > current) {
                            alert("Withdrawal amount cannot exceed current saved balance.");
                            return;
                          }
                          depositMutation.mutate({ id: goal.id, newAmount: Math.max(0, current - withdrawAmt) });
                        }
                      }}
                      disabled={depositMutation.isPending}
                      className="h-8 text-xs gap-1 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                    >
                      <ArrowDownLeft className="h-3.5 w-3.5 text-amber-600" /> - Withdraw
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete savings goal ${goal.name}?`)) {
                          deleteMutation.mutate(goal.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total goals)
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

      {/* Add Savings Goal Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-card border p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95">
            <h3 className="text-xl font-bold mb-1">Add Savings Goal</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Set target savings amounts and track deposit progress
            </p>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Savings Goal Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Emergency Fund or Vacation Fund"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="accountId">Target Bank / MoMo Account to Save Into (Optional)</Label>
                <select
                  id="accountId"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select Account (Optional)</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="targetAmount">Target Goal Amount (GHS)</Label>
                  <Input
                    id="targetAmount"
                    type="number"
                    step="0.01"
                    placeholder="5000.00"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="currentAmount">Initial Saved Amount</Label>
                  <Input
                    id="currentAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="deadline">Target Deadline (Optional)</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
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

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-brand-teal text-white hover:bg-brand-teal/90"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Saving..." : "Save Goal"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
