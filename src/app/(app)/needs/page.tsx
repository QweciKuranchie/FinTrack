"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Plus, Check, Trash2, Loader2 } from "lucide-react";

interface NeedItem {
  id: string;
  title: string;
  category: "MUST_HAVE" | "HIGH_PRIORITY" | "MEDIUM" | "WANT";
  estimatedCost: number;
  isFulfilled: boolean;
  notes?: string | null;
}

export default function NeedsPage() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<NeedItem["category"]>("MUST_HAVE");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [notes, setNotes] = useState("");

  // Query real needs from PostgreSQL
  const { data: needsData, isLoading } = useQuery<{ data: NeedItem[] }>({
    queryKey: ["needs"],
    queryFn: async () => {
      const res = await fetch("/api/needs");
      if (!res.ok) throw new Error("Failed to fetch needs");
      return res.json();
    },
  });

  const needs = needsData?.data ?? [];

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: { title: string; category: string; estimatedCost: number; notes?: string }) => {
      const res = await fetch("/api/needs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create need item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["needs"] });
      setIsAdding(false);
      setTitle("");
      setEstimatedCost("");
      setNotes("");
    },
  });

  // Toggle Fulfilled Mutation
  const toggleFulfilledMutation = useMutation({
    mutationFn: async ({ id, isFulfilled }: { id: string; isFulfilled: boolean }) => {
      const res = await fetch(`/api/needs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFulfilled }),
      });
      if (!res.ok) throw new Error("Failed to update need item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["needs"] });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/needs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete need item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["needs"] });
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !estimatedCost) return;

    createMutation.mutate({
      title,
      category,
      estimatedCost: parseFloat(estimatedCost) || 0,
      notes: notes || undefined,
    });
  };

  const totalNeedsCost = needs.reduce((sum, n) => sum + Number(n.estimatedCost), 0);
  const fulfilledCost = needs.filter((n) => n.isFulfilled).reduce((sum, n) => sum + Number(n.estimatedCost), 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <CheckSquare className="h-7 w-7 text-brand-teal" /> Needs & Wants Planner
          </h1>
          <p className="text-sm text-muted-foreground">
            Prioritize essential living requirements vs. optional discretionary wants
          </p>
        </div>

        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} className="bg-brand-teal text-white hover:bg-brand-teal/90 shadow-xs cursor-pointer">
            <Plus className="h-4 w-4 mr-2" /> Add Need / Want
          </Button>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold">Total Planned Expenditure</p>
            <p className="text-2xl font-extrabold text-foreground mt-1">GHS {totalNeedsCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold">Fulfilled Requirements</p>
            <p className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 mt-1">GHS {fulfilledCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold">Outstanding Balance</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">GHS {(totalNeedsCost - fulfilledCost).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Item Form */}
      {isAdding && (
        <Card className="border-brand-teal/30 bg-teal-50/20 dark:bg-teal-950/10">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Add Need / Discretionary Item</CardTitle>
            <CardDescription className="text-xs">Classify by essential priority</CardDescription>
          </CardHeader>
          <form onSubmit={handleAdd}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="title">Item Title</Label>
                  <Input id="title" placeholder="e.g. School Fees, Gym Membership" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cat">Priority Category</Label>
                  <select id="cat" value={category} onChange={(e) => setCategory(e.target.value as NeedItem["category"])} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
                    <option value="MUST_HAVE">Must Have (Essential Need)</option>
                    <option value="HIGH_PRIORITY">High Priority (Important)</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="WANT">Discretionary Want (Optional)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cost">Estimated Amount (GHS)</Label>
                  <Input id="cost" type="number" step="0.01" placeholder="0.00" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} required />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input id="notes" placeholder="Where to purchase, deadline..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button type="submit" className="bg-brand-teal text-white hover:bg-brand-teal/90" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saving..." : "Save Item"}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* Needs Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Needs & Wants Breakdown</CardTitle>
          <CardDescription className="text-xs">Check off items as they are funded or fulfilled</CardDescription>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-brand-teal" /> Loading needs & wants list...
            </div>
          ) : needs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No needs or discretionary items logged yet. Click &quot;Add Need / Want&quot; above to create one.
            </div>
          ) : (
            needs.map((n) => (
              <div key={n.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleFulfilledMutation.mutate({ id: n.id, isFulfilled: !n.isFulfilled })}
                    disabled={toggleFulfilledMutation.isPending}
                    className={`h-6 w-6 rounded border flex items-center justify-center cursor-pointer transition-colors ${n.isFulfilled ? "bg-brand-teal border-brand-teal text-white" : "border-input hover:border-brand-teal"}`}
                  >
                    {n.isFulfilled && <Check className="h-4 w-4" />}
                  </button>
                  <div>
                    <h4 className={`font-bold text-base ${n.isFulfilled ? "line-through text-muted-foreground" : "text-foreground"}`}>{n.title}</h4>
                    <p className="text-xs text-muted-foreground">{n.notes || "No notes"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-extrabold text-base text-foreground">GHS {Number(n.estimatedCost).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                    <Badge variant={n.category === "MUST_HAVE" ? "destructive" : n.category === "HIGH_PRIORITY" ? "teal" : "outline"} className="text-[10px] mt-0.5">
                      {n.category.replace("_", " ")}
                    </Badge>
                  </div>

                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(n.id)} disabled={deleteMutation.isPending} className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer">
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
