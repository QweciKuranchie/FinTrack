"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Handshake, Plus, CheckCircle2, Clock, Trash2 } from "lucide-react";

interface PromiseItem {
  id: string;
  recipient: string;
  purpose: string;
  amount: number;
  dueDate?: string;
  status: "PENDING" | "FULFILLED" | "PARTIAL";
  notes?: string;
}

export default function PromisePage() {
  const [promises, setPromises] = useState<PromiseItem[]>([
    { id: "1", recipient: "Church Building Pledge", purpose: "Building Expansion Fund", amount: 1000, dueDate: "2026-10-31", status: "PARTIAL", notes: "GHS 500 paid so far" },
    { id: "2", recipient: "Family Support (Parents)", purpose: "Quarterly Living Allowance", amount: 1500, dueDate: "2026-09-15", status: "PENDING", notes: "Send via MoMo" },
    { id: "3", recipient: "Alumni Donation", purpose: "Scholarship Scheme", amount: 300, dueDate: "2026-08-01", status: "FULFILLED", notes: "Receipt received" },
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [purpose, setPurpose] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !purpose || !amount) return;

    const newItem: PromiseItem = {
      id: Date.now().toString(),
      recipient,
      purpose,
      amount: parseFloat(amount),
      dueDate: dueDate || undefined,
      status: "PENDING",
      notes: notes || undefined,
    };

    setPromises([newItem, ...promises]);
    setIsAdding(false);
    setRecipient("");
    setPurpose("");
    setAmount("");
    setDueDate("");
    setNotes("");
  };

  const toggleStatus = (id: string) => {
    setPromises(promises.map((p) => {
      if (p.id !== id) return p;
      const nextStatus = p.status === "PENDING" ? "PARTIAL" : p.status === "PARTIAL" ? "FULFILLED" : "PENDING";
      return { ...p, status: nextStatus };
    }));
  };

  const deleteItem = (id: string) => {
    setPromises(promises.filter((p) => p.id !== id));
  };

  const totalPromised = promises.reduce((sum, p) => sum + p.amount, 0);
  const fulfilledPromised = promises.filter((p) => p.status === "FULFILLED").reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <Handshake className="h-7 w-7 text-brand-teal" /> Financial Promises & Pledges
          </h1>
          <p className="text-sm text-muted-foreground">
            Track personal commitments, church pledges, donations, and family support promises
          </p>
        </div>

        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} className="bg-brand-teal text-white hover:bg-brand-teal/90 shadow-xs cursor-pointer">
            <Plus className="h-4 w-4 mr-2" /> Add Financial Promise
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold">Total Promised Commitments</p>
            <p className="text-2xl font-extrabold text-foreground mt-1">GHS {totalPromised.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold">Fulfilled Commitments</p>
            <p className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 mt-1">GHS {fulfilledPromised.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold">Pending Promises</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">GHS {(totalPromised - fulfilledPromised).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Promise Modal */}
      {isAdding && (
        <Card className="border-brand-teal/30 bg-teal-50/20 dark:bg-teal-950/10">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Add Pledge / Commitment</CardTitle>
            <CardDescription className="text-xs">Record pledged support or promised donations</CardDescription>
          </CardHeader>
          <form onSubmit={handleAdd}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="recipient">Beneficiary / Recipient</Label>
                  <Input id="recipient" placeholder="e.g. Church, Cousin John, Charity" value={recipient} onChange={(e) => setRecipient(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="purpose">Pledge Purpose / Cause</Label>
                  <Input id="purpose" placeholder="e.g. Welfare support, Building fund" value={purpose} onChange={(e) => setPurpose(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="amount">Pledged Amount (GHS)</Label>
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
                <Button type="submit" className="bg-brand-teal text-white hover:bg-brand-teal/90">Save Promise</Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* Promise Ledger */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Financial Commitments Ledger</CardTitle>
          <CardDescription className="text-xs">Click status badge to update fulfillment progress</CardDescription>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {promises.map((p) => (
            <div key={p.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className={`font-bold text-base ${p.status === "FULFILLED" ? "line-through text-muted-foreground" : "text-foreground"}`}>{p.recipient}</h4>
                  <span className="text-xs text-muted-foreground">• {p.purpose}</span>
                </div>
                <p className="text-xs text-muted-foreground">Due: {p.dueDate || "Flexible"} {p.notes && `| ${p.notes}`}</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-extrabold text-base text-foreground">GHS {p.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                  <button onClick={() => toggleStatus(p.id)} className="text-xs cursor-pointer hover:underline font-semibold flex items-center gap-1 justify-end mt-0.5">
                    {p.status === "FULFILLED" && <span className="text-teal-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Fulfilled</span>}
                    {p.status === "PARTIAL" && <span className="text-amber-600 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Partially Paid</span>}
                    {p.status === "PENDING" && <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Pending</span>}
                  </button>
                </div>

                <Button size="icon" variant="ghost" onClick={() => deleteItem(p.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
