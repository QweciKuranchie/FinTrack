"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  HandCoins,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Trash2,
  CheckCircle2,
  UserCheck,
  Scale,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface DebtRecordItem {
  id: string;
  title: string;
  counterparty: string;
  isReceivable: boolean;
  amount: number;
  currentBalance: number;
  dueDate?: string | null;
  currency: string;
  notes?: string | null;
}

interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export default function DebtTrackerPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"I_OWE" | "OWED_TO_ME">("I_OWE");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;

  // Form State
  const [formType, setFormType] = useState<"I_OWE" | "OWED_TO_ME">("I_OWE");
  const [formTitle, setFormTitle] = useState("");
  const [formPerson, setFormPerson] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Fetch debt records from database with pagination
  const { data: debtRecordsResponse, isLoading, isError } = useQuery<{
    data: DebtRecordItem[];
    pagination?: PaginationMeta;
  }>({
    queryKey: ["debt-tracker", page, limit],
    queryFn: async () => {
      const res = await fetch(`/api/debt-tracker?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch debt records");
      return res.json();
    },
  });

  const dbDebts = debtRecordsResponse?.data ?? [];
  const pagination = debtRecordsResponse?.pagination ?? { page: 1, limit: 10, totalCount: 0, totalPages: 1 };

  // Calculate Real-Time Totals
  const totalIOwe = dbDebts
    .filter((l) => !l.isReceivable)
    .reduce((sum, l) => sum + Number(l.currentBalance || 0), 0);

  const totalOwedToMe = dbDebts
    .filter((l) => l.isReceivable)
    .reduce((sum, l) => sum + Number(l.currentBalance || 0), 0);

  const netDebt = totalOwedToMe - totalIOwe;

  // Create Debt Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/debt-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create debt record");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debt-tracker"] });
      setIsAddModalOpen(false);
      setFormTitle("");
      setFormPerson("");
      setFormAmount("");
      setFormDueDate("");
      setFormNotes("");
    },
  });

  // Update Debt Payment Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, currentBalance }: { id: string; currentBalance: number }) => {
      const res = await fetch(`/api/debt-tracker/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentBalance }),
      });
      if (!res.ok) throw new Error("Failed to update debt payment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debt-tracker"] });
    },
  });

  // Delete Debt Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/debt-tracker/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete debt record");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debt-tracker"] });
    },
  });

  const handleAddDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formAmount) return;

    createMutation.mutate({
      title: formTitle,
      counterparty: formPerson || "General",
      isReceivable: formType === "OWED_TO_ME",
      amount: parseFloat(formAmount),
      currentBalance: parseFloat(formAmount),
      dueDate: formDueDate || null,
      notes: formNotes || null,
      currency: "GHS",
    });
  };

  const handleRecordPayment = (id: string, currentBalance: number, paymentAmt: number) => {
    const newBalance = Math.max(0, currentBalance - paymentAmt);
    updateMutation.mutate({ id, currentBalance: newBalance });
  };

  const handleDeleteDebt = (id: string) => {
    if (confirm("Are you sure you want to delete this debt record?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredDebts = dbDebts.filter((l) =>
    activeTab === "I_OWE" ? !l.isReceivable : l.isReceivable
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <HandCoins className="h-7 w-7 text-brand-teal" /> Debt Tracker
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time tracking of debts you owe and receivables owed to you
          </p>
        </div>

        <Button
          onClick={() => {
            setFormType(activeTab);
            setIsAddModalOpen(true);
          }}
          className="bg-brand-teal text-white hover:bg-brand-teal/90 shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Debt Record
        </Button>
      </div>

      {/* Top 3 Real-Time Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total I Owe */}
        <Card className="border-red-900/10 bg-red-50/50 dark:bg-red-950/20 hover:border-red-500/40 transition-colors">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
              Total I Owe
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-2xl font-extrabold tracking-tight text-destructive">
              GHS {totalIOwe.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Liabilities & Outstanding Debts</p>
          </CardContent>
        </Card>

        {/* Total Owed to Me */}
        <Card className="border-teal-900/10 bg-teal-50/50 dark:bg-teal-950/20 hover:border-brand-teal/40 transition-colors">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
              Total Owed to Me
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-2xl font-extrabold tracking-tight text-teal-600 dark:text-teal-400">
              GHS {totalOwedToMe.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Receivables & Loans Granted</p>
          </CardContent>
        </Card>

        {/* Net Debt Position */}
        <Card className="hover:border-border transition-colors">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Net Debt Position
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <Scale className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p
              className={`text-2xl font-extrabold tracking-tight ${
                netDebt >= 0 ? "text-teal-600 dark:text-teal-400" : "text-destructive"
              }`}
            >
              {netDebt >= 0 ? "+" : ""}GHS {netDebt.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Owed to Me minus Total I Owe</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Section with 2 Interactive Tabs & Pagination */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold">Debt Breakdown</CardTitle>
              <CardDescription className="text-xs">
                Real-time database items with pagination
              </CardDescription>
            </div>

            {/* Tabs Toggle */}
            <div className="flex items-center rounded-xl bg-muted p-1 border">
              <button
                onClick={() => {
                  setActiveTab("I_OWE");
                  setPage(1);
                }}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === "I_OWE"
                    ? "bg-card text-destructive shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span>I Owe ({dbDebts.filter((l) => !l.isReceivable).length})</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("OWED_TO_ME");
                  setPage(1);
                }}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === "OWED_TO_ME"
                    ? "bg-card text-brand-teal shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ArrowDownLeft className="h-3.5 w-3.5" />
                <span>Owed to Me ({dbDebts.filter((l) => l.isReceivable).length})</span>
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-brand-teal" />
              <span className="text-sm">Loading real-time debts...</span>
            </div>
          ) : isError ? (
            <div className="p-6 text-center text-sm text-destructive">
              Failed to load debt records. Please try again.
            </div>
          ) : filteredDebts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <UserCheck className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-semibold">No records in this tab.</p>
              <p className="text-xs mt-1">Click &quot;Add Debt Record&quot; to log a new entry.</p>
            </div>
          ) : (
            filteredDebts.map((item) => {
              const principalNum = Number(item.amount || 0);
              const balanceNum = Number(item.currentBalance || 0);
              const paidNum = Math.max(0, principalNum - balanceNum);
              const progressPct = principalNum > 0 ? Math.min(100, Math.round((paidNum / principalNum) * 100)) : 100;
              const isSettled = balanceNum === 0;

              return (
                <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-foreground">{item.title}</h4>
                      <Badge variant={isSettled ? "secondary" : !item.isReceivable ? "destructive" : "teal"} className="text-[10px]">
                        {isSettled ? "Settled" : !item.isReceivable ? "I Owe" : "Owed to Me"}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {!item.isReceivable ? "Creditor: " : "Debtor: "}
                      <span className="font-semibold text-foreground">{item.counterparty || "General"}</span>
                      {item.dueDate && ` • Due date: ${new Date(item.dueDate).toLocaleDateString()}`}
                    </p>

                    {item.notes && <p className="text-xs text-muted-foreground/80 italic">{item.notes}</p>}

                    {/* Paydown Progress Bar */}
                    <div className="w-full max-w-xs pt-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                        <span>Paid: GHS {paidNum.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        <span>{progressPct}% Settled</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isSettled ? "bg-teal-500" : !item.isReceivable ? "bg-red-500" : "bg-brand-teal"
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-muted-foreground font-medium">Remaining Balance</p>
                      <p className={`text-xl font-extrabold ${isSettled ? "text-muted-foreground line-through" : !item.isReceivable ? "text-destructive" : "text-brand-teal"}`}>
                        {item.currency} {balanceNum.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Original: {item.currency} {principalNum.toLocaleString()}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isSettled && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const amtStr = prompt(`Enter payment amount for ${item.title} (GHS):`, balanceNum.toString());
                            if (amtStr && !isNaN(parseFloat(amtStr))) {
                              handleRecordPayment(item.id, balanceNum, parseFloat(amtStr));
                            }
                          }}
                          className="h-8 text-xs gap-1"
                          disabled={updateMutation.isPending}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" /> Pay
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteDebt(item.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        disabled={deleteMutation.isPending}
                        title="Delete record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>

        {/* Real-Time Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total items)
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

      {/* Add Debt Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-card border p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95">
            <h3 className="text-xl font-bold mb-1">Add Debt Record</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Saved directly to your database in real time
            </p>

            <form onSubmit={handleAddDebt} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormType("I_OWE")}
                  className={`py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    formType === "I_OWE" ? "bg-card text-destructive shadow-xs" : "text-muted-foreground"
                  }`}
                >
                  I Owe (Liability)
                </button>
                <button
                  type="button"
                  onClick={() => setFormType("OWED_TO_ME")}
                  className={`py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    formType === "OWED_TO_ME" ? "bg-card text-brand-teal shadow-xs" : "text-muted-foreground"
                  }`}
                >
                  Owed to Me (Receivable)
                </button>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="formTitle">Debt Title / Purpose</Label>
                <Input
                  id="formTitle"
                  placeholder="e.g. Car Repair Loan or Laptop Purchase"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="formPerson">
                  {formType === "I_OWE" ? "Creditor / Person You Owe" : "Debtor / Person Who Owes You"}
                </Label>
                <Input
                  id="formPerson"
                  placeholder="e.g. Kwame Mensah or Ecobank"
                  value={formPerson}
                  onChange={(e) => setFormPerson(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="formAmount">Total Amount (GHS)</Label>
                  <Input
                    id="formAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="formDueDate">Due Date (Optional)</Label>
                  <Input
                    id="formDueDate"
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="formNotes">Notes (Optional)</Label>
                <Input
                  id="formNotes"
                  placeholder="Installment terms or notes"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
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
                  {createMutation.isPending ? "Saving..." : "Save Debt Record"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
