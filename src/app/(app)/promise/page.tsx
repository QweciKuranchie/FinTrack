"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Handshake, Plus, CheckCircle2, Clock, Trash2, Loader2, ArrowUpRight, ArrowDownLeft } from "lucide-react";

interface PromiseItem {
  id: string;
  type: "PROMISED_BY_ME" | "PROMISED_TO_ME";
  recipient: string;
  purpose: string;
  amount: number;
  dueDate?: string | null;
  status: "PENDING" | "FULFILLED" | "PARTIAL";
  notes?: string | null;
}

export default function PromisePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"PROMISED_BY_ME" | "PROMISED_TO_ME">("PROMISED_BY_ME");
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [promiseType, setPromiseType] = useState<"PROMISED_BY_ME" | "PROMISED_TO_ME">("PROMISED_BY_ME");
  const [recipient, setRecipient] = useState("");
  const [purpose, setPurpose] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  // Query real promises from PostgreSQL
  const { data: promisesData, isLoading } = useQuery<{ data: PromiseItem[] }>({
    queryKey: ["promises"],
    queryFn: async () => {
      const res = await fetch("/api/promises");
      if (!res.ok) throw new Error("Failed to fetch promises");
      return res.json();
    },
  });

  const promises = promisesData?.data ?? [];

  // Filter by active tab
  const filteredPromises = promises.filter((p) => (p.type || "PROMISED_BY_ME") === activeTab);

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: { type: string; recipient: string; purpose: string; amount: number; dueDate?: string; notes?: string }) => {
      const res = await fetch("/api/promises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create promise pledge");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promises"] });
      setIsAdding(false);
      setRecipient("");
      setPurpose("");
      setAmount("");
      setDueDate("");
      setNotes("");
    },
  });

  // Toggle Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/promises/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promises"] });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/promises/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete promise");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promises"] });
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !purpose || !amount) return;

    createMutation.mutate({
      type: promiseType,
      recipient,
      purpose,
      amount: parseFloat(amount) || 0,
      dueDate: dueDate || undefined,
      notes: notes || undefined,
    });
  };

  const toggleStatus = (p: PromiseItem) => {
    const nextStatus = p.status === "PENDING" ? "PARTIAL" : p.status === "PARTIAL" ? "FULFILLED" : "PENDING";
    updateStatusMutation.mutate({ id: p.id, status: nextStatus });
  };

  const promisesMadeByMe = promises.filter((p) => (p.type || "PROMISED_BY_ME") === "PROMISED_BY_ME");
  const promisesMadeToMe = promises.filter((p) => p.type === "PROMISED_TO_ME");

  const totalByMe = promisesMadeByMe.reduce((sum, p) => sum + Number(p.amount), 0);
  const fulfilledByMe = promisesMadeByMe.filter((p) => p.status === "FULFILLED").reduce((sum, p) => sum + Number(p.amount), 0);

  const totalToMe = promisesMadeToMe.reduce((sum, p) => sum + Number(p.amount), 0);
  const fulfilledToMe = promisesMadeToMe.filter((p) => p.status === "FULFILLED").reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <Handshake className="h-7 w-7 text-brand-teal" /> Financial Promises & Pledges
          </h1>
          <p className="text-sm text-muted-foreground">
            Track commitments you made to others vs. financial pledges made to you
          </p>
        </div>

        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} className="bg-brand-teal text-white hover:bg-brand-teal/90 shadow-xs cursor-pointer">
            <Plus className="h-4 w-4 mr-2" /> Add Financial Promise
          </Button>
        )}
      </div>

      {/* Tabs Bar: Promises I Made vs Promises Made to Me */}
      <div className="flex border-b space-x-4">
        <button
          onClick={() => setActiveTab("PROMISED_BY_ME")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer border-b-2 ${
            activeTab === "PROMISED_BY_ME"
              ? "border-brand-teal text-brand-teal"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowUpRight className="h-4 w-4 text-amber-600" /> Promises I Made (Pledges) ({promisesMadeByMe.length})
        </button>
        <button
          onClick={() => setActiveTab("PROMISED_TO_ME")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer border-b-2 ${
            activeTab === "PROMISED_TO_ME"
              ? "border-brand-teal text-brand-teal"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowDownLeft className="h-4 w-4 text-teal-600" /> Promises Made to Me (Owed to Me) ({promisesMadeToMe.length})
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold">
              {activeTab === "PROMISED_BY_ME" ? "Total Pledged by Me" : "Total Promised to Me"}
            </p>
            <p className="text-2xl font-extrabold text-foreground mt-1">
              GHS {(activeTab === "PROMISED_BY_ME" ? totalByMe : totalToMe).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold">Fulfilled Amount</p>
            <p className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 mt-1">
              GHS {(activeTab === "PROMISED_BY_ME" ? fulfilledByMe : fulfilledToMe).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold">Outstanding Balance</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">
              GHS {((activeTab === "PROMISED_BY_ME" ? totalByMe - fulfilledByMe : totalToMe - fulfilledToMe)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Promise Form */}
      {isAdding && (
        <Card className="border-brand-teal/30 bg-teal-50/20 dark:bg-teal-950/10">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Add Pledge / Commitment</CardTitle>
            <CardDescription className="text-xs">Record promised support, debts owed to you, or commitments</CardDescription>
          </CardHeader>
          <form onSubmit={handleAdd}>
            <CardContent className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPromiseType("PROMISED_BY_ME")}
                  className={`py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                    promiseType === "PROMISED_BY_ME"
                      ? "bg-brand-teal text-white border-brand-teal shadow-xs"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Promises I Made (My Pledges)
                </button>
                <button
                  type="button"
                  onClick={() => setPromiseType("PROMISED_TO_ME")}
                  className={`py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                    promiseType === "PROMISED_TO_ME"
                      ? "bg-brand-teal text-white border-brand-teal shadow-xs"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Promises Made to Me (Owed to Me)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="recipient">
                    {promiseType === "PROMISED_BY_ME" ? "Beneficiary / Recipient" : "Pledger / Debtor Name"}
                  </Label>
                  <Input
                    id="recipient"
                    placeholder={promiseType === "PROMISED_BY_ME" ? "e.g. Church, Cousin John" : "e.g. Kwame, Employer Bonus"}
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="purpose">Pledge Purpose / Cause</Label>
                  <Input id="purpose" placeholder="e.g. Welfare support, Loan repayment" value={purpose} onChange={(e) => setPurpose(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="amount">Promised Amount (GHS)</Label>
                  <Input id="amount" type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dueDate">Target Fulfillment Date</Label>
                  <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="notes">Notes / Payment Channel (Optional)</Label>
                  <Input id="notes" placeholder="e.g. Monthly installments..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button type="submit" className="bg-brand-teal text-white hover:bg-brand-teal/90" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saving..." : "Save Promise"}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* Promise Ledger List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">
            {activeTab === "PROMISED_BY_ME" ? "Pledges & Commitments I Made" : "Pledges & Commitments Made to Me"}
          </CardTitle>
          <CardDescription className="text-xs">Click status badge to update fulfillment progress</CardDescription>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-brand-teal" /> Loading promises...
            </div>
          ) : filteredPromises.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No promises found in this category. Click &quot;Add Financial Promise&quot; above to add one.
            </div>
          ) : (
            filteredPromises.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-bold text-base ${p.status === "FULFILLED" ? "line-through text-muted-foreground" : "text-foreground"}`}>{p.recipient}</h4>
                    <span className="text-xs text-muted-foreground">• {p.purpose}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Due: {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : "Flexible"} {p.notes && `| ${p.notes}`}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-extrabold text-base text-foreground">GHS {Number(p.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                    <button onClick={() => toggleStatus(p)} disabled={updateStatusMutation.isPending} className="text-xs cursor-pointer hover:underline font-semibold flex items-center gap-1 justify-end mt-0.5">
                      {p.status === "FULFILLED" && <span className="text-teal-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Fulfilled</span>}
                      {p.status === "PARTIAL" && <span className="text-amber-600 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Partially Paid</span>}
                      {p.status === "PENDING" && <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Pending</span>}
                    </button>
                  </div>

                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(p.id)} disabled={deleteMutation.isPending} className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
