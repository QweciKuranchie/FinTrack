"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Wrench, Plus, CheckCircle2, Clock, AlertTriangle, Trash2, Loader2, RefreshCw } from "lucide-react";

interface RepairItem {
  id: string;
  type: "REPAIR" | "REPLACEMENT";
  item: string;
  category: string;
  estimatedCost: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  urgency: "HIGH" | "MEDIUM" | "LOW";
  notes?: string | null;
}

export default function RepairsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"REPAIR" | "REPLACEMENT">("REPAIR");
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [itemType, setItemType] = useState<"REPAIR" | "REPLACEMENT">("REPAIR");
  const [item, setItem] = useState("");
  const [category, setCategory] = useState("Home & Property");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [urgency, setUrgency] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");
  const [notes, setNotes] = useState("");

  // Query real repairs & replacements from PostgreSQL
  const { data: repairsData, isLoading } = useQuery<{ data: RepairItem[] }>({
    queryKey: ["repairs"],
    queryFn: async () => {
      const res = await fetch("/api/repairs");
      if (!res.ok) throw new Error("Failed to fetch repairs");
      return res.json();
    },
  });

  const repairs = repairsData?.data ?? [];

  // Filter items according to active tab
  const filteredItems = repairs.filter((r) => (r.type || "REPAIR") === activeTab);

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: { type: string; item: string; category: string; estimatedCost: number; urgency: string; notes?: string }) => {
      const res = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      setIsAdding(false);
      setItem("");
      setEstimatedCost("");
      setNotes("");
    },
  });

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/repairs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/repairs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !estimatedCost) return;

    createMutation.mutate({
      type: itemType,
      item,
      category,
      estimatedCost: parseFloat(estimatedCost) || 0,
      urgency,
      notes: notes || undefined,
    });
  };

  const toggleStatus = (r: RepairItem) => {
    const nextStatus = r.status === "PENDING" ? "IN_PROGRESS" : r.status === "IN_PROGRESS" ? "COMPLETED" : "PENDING";
    updateStatusMutation.mutate({ id: r.id, status: nextStatus });
  };

  const repairsList = repairs.filter((r) => (r.type || "REPAIR") === "REPAIR");
  const replacementsList = repairs.filter((r) => r.type === "REPLACEMENT");

  const currentTabItems = activeTab === "REPAIR" ? repairsList : replacementsList;
  const currentTabTotalCost = currentTabItems.reduce((sum, r) => sum + Number(r.estimatedCost), 0);
  const currentTabCompletedCost = currentTabItems.filter((r) => r.status === "COMPLETED").reduce((sum, r) => sum + Number(r.estimatedCost), 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <Wrench className="h-7 w-7 text-brand-teal" /> Replacement & Repairs Tracker
          </h1>
          <p className="text-sm text-muted-foreground">
            Track planned maintenance repairs vs. appliance & equipment replacements
          </p>
        </div>

        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} className="bg-brand-teal text-white hover:bg-brand-teal/90 shadow-xs cursor-pointer">
            <Plus className="h-4 w-4 mr-2" /> Add Task
          </Button>
        )}
      </div>

      {/* Tabs Bar: Repairs vs Replacements */}
      <div className="flex border-b space-x-4">
        <button
          onClick={() => setActiveTab("REPAIR")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer border-b-2 ${
            activeTab === "REPAIR"
              ? "border-brand-teal text-brand-teal"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Wrench className="h-4 w-4" /> Repairs & Maintenance ({repairsList.length})
        </button>
        <button
          onClick={() => setActiveTab("REPLACEMENT")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer border-b-2 ${
            activeTab === "REPLACEMENT"
              ? "border-brand-teal text-brand-teal"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <RefreshCw className="h-4 w-4" /> Equipment Replacements ({replacementsList.length})
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold">
              {activeTab === "REPAIR" ? "Total Repair Budget" : "Total Replacement Budget"}
            </p>
            <p className="text-2xl font-extrabold text-foreground mt-1">GHS {currentTabTotalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold">Completed Amount</p>
            <p className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 mt-1">GHS {currentTabCompletedCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold">Outstanding Pending Cost</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">GHS {(currentTabTotalCost - currentTabCompletedCost).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Task Form */}
      {isAdding && (
        <Card className="border-brand-teal/30 bg-teal-50/20 dark:bg-teal-950/10">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Add Maintenance / Replacement Task</CardTitle>
            <CardDescription className="text-xs">Log upcoming repair requirements or replacement budgets</CardDescription>
          </CardHeader>
          <form onSubmit={handleAdd}>
            <CardContent className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setItemType("REPAIR")}
                  className={`py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                    itemType === "REPAIR"
                      ? "bg-brand-teal text-white border-brand-teal shadow-xs"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Repair & Servicing
                </button>
                <button
                  type="button"
                  onClick={() => setItemType("REPLACEMENT")}
                  className={`py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                    itemType === "REPLACEMENT"
                      ? "bg-brand-teal text-white border-brand-teal shadow-xs"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Equipment Replacement
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="item">Item / Equipment Title</Label>
                  <Input id="item" placeholder={itemType === "REPAIR" ? "e.g. Generator Servicing" : "e.g. Kitchen Fridge Replacement"} value={item} onChange={(e) => setItem(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="category">Category</Label>
                  <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
                    <option value="Home & Property">Home & Property</option>
                    <option value="Vehicle">Vehicle & Auto</option>
                    <option value="Electronics">Electronics & Tech</option>
                    <option value="Appliances">Home Appliances</option>
                    <option value="Other">Other Maintenance</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cost">Estimated Cost (GHS)</Label>
                  <Input id="cost" type="number" step="0.01" placeholder="0.00" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="urgency">Urgency Level</Label>
                  <select id="urgency" value={urgency} onChange={(e) => setUrgency(e.target.value as "HIGH" | "MEDIUM" | "LOW")} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
                    <option value="HIGH">High Priority (Urgent)</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="LOW">Low Priority (Optional)</option>
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="notes">Notes / Technician Details (Optional)</Label>
                  <Input id="notes" placeholder="Brand model, contact phone..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button type="submit" className="bg-brand-teal text-white hover:bg-brand-teal/90" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saving..." : "Save Task"}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* Item List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">
            {activeTab === "REPAIR" ? "Planned Repairs & Maintenance Ledger" : "Equipment Replacements Ledger"}
          </CardTitle>
          <CardDescription className="text-xs">Click status badge to toggle task state (Pending → In Progress → Completed)</CardDescription>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-brand-teal" /> Loading records...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No {activeTab === "REPAIR" ? "repair" : "replacement"} tasks logged yet. Click &quot;Add Task&quot; above to create one.
            </div>
          ) : (
            filteredItems.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-bold text-base ${r.status === "COMPLETED" ? "line-through text-muted-foreground" : "text-foreground"}`}>{r.item}</h4>
                    <Badge variant={r.urgency === "HIGH" ? "destructive" : r.urgency === "MEDIUM" ? "outline" : "secondary"} className="text-[10px]">
                      {r.urgency} Priority
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.category} {r.notes && `• ${r.notes}`}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-extrabold text-base text-foreground">GHS {Number(r.estimatedCost).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                    <button onClick={() => toggleStatus(r)} className="text-xs cursor-pointer hover:underline font-semibold flex items-center gap-1 justify-end mt-0.5" disabled={updateStatusMutation.isPending}>
                      {r.status === "COMPLETED" && <span className="text-teal-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Completed</span>}
                      {r.status === "IN_PROGRESS" && <span className="text-amber-600 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> In Progress</span>}
                      {r.status === "PENDING" && <span className="text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Pending</span>}
                    </button>
                  </div>

                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(r.id)} disabled={deleteMutation.isPending} className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer">
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
