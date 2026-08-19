"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Wrench, Plus, CheckCircle2, Clock, AlertTriangle, Trash2 } from "lucide-react";

interface RepairItem {
  id: string;
  item: string;
  category: string;
  estimatedCost: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  urgency: "HIGH" | "MEDIUM" | "LOW";
  notes?: string;
}

export default function RepairsPage() {
  const [repairs, setRepairs] = useState<RepairItem[]>([
    { id: "1", item: "Vehicle Brake Pad Replacement", category: "Vehicle", estimatedCost: 450, status: "IN_PROGRESS", urgency: "HIGH", notes: "Mechanic appointment scheduled" },
    { id: "2", item: "Air Conditioner Servicing", category: "Home Appliance", estimatedCost: 200, status: "PENDING", urgency: "MEDIUM", notes: "Filters need cleaning" },
    { id: "3", item: "Laptop Screen Hinge Fix", category: "Electronics", estimatedCost: 350, status: "COMPLETED", urgency: "LOW", notes: "Repaired on Monday" },
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [item, setItem] = useState("");
  const [category, setCategory] = useState("Home & Property");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [urgency, setUrgency] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");
  const [notes, setNotes] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !estimatedCost) return;

    const newItem: RepairItem = {
      id: Date.now().toString(),
      item,
      category,
      estimatedCost: parseFloat(estimatedCost),
      status: "PENDING",
      urgency,
      notes: notes || undefined,
    };

    setRepairs([newItem, ...repairs]);
    setIsAdding(false);
    setItem("");
    setEstimatedCost("");
    setNotes("");
  };

  const toggleStatus = (id: string) => {
    setRepairs(repairs.map((r) => {
      if (r.id !== id) return r;
      const nextStatus = r.status === "PENDING" ? "IN_PROGRESS" : r.status === "IN_PROGRESS" ? "COMPLETED" : "PENDING";
      return { ...r, status: nextStatus };
    }));
  };

  const deleteItem = (id: string) => {
    setRepairs(repairs.filter((r) => r.id !== id));
  };

  const totalEstimatedCost = repairs.reduce((sum, r) => sum + r.estimatedCost, 0);
  const completedCost = repairs.filter((r) => r.status === "COMPLETED").reduce((sum, r) => sum + r.estimatedCost, 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <Wrench className="h-7 w-7 text-brand-teal" /> Replacement & Repairs Tracker
          </h1>
          <p className="text-sm text-muted-foreground">
            Track planned maintenance, equipment replacements, and repair budgets
          </p>
        </div>

        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} className="bg-brand-teal text-white hover:bg-brand-teal/90 shadow-xs cursor-pointer">
            <Plus className="h-4 w-4 mr-2" /> Add Repair Task
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold">Total Estimated Expenses</p>
            <p className="text-2xl font-extrabold text-foreground mt-1">GHS {totalEstimatedCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold">Completed Repairs</p>
            <p className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 mt-1">GHS {completedCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold">Pending Repairs</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">GHS {(totalEstimatedCost - completedCost).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Repair Modal */}
      {isAdding && (
        <Card className="border-brand-teal/30 bg-teal-50/20 dark:bg-teal-950/10">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Add Maintenance / Replacement Task</CardTitle>
            <CardDescription className="text-xs">Log upcoming repair requirements or replacement budgets</CardDescription>
          </CardHeader>
          <form onSubmit={handleAdd}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="item">Item / Equipment Title</Label>
                  <Input id="item" placeholder="e.g. Generator Servicing" value={item} onChange={(e) => setItem(e.target.value)} required />
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
                  <Label htmlFor="notes">Notes / Mechanic Info (Optional)</Label>
                  <Input id="notes" placeholder="Part numbers, technician phone..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button type="submit" className="bg-brand-teal text-white hover:bg-brand-teal/90">Save Repair Task</Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* Repairs List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Planned Maintenance Ledger</CardTitle>
          <CardDescription className="text-xs">Click status badge to toggle task state (Pending → In Progress → Completed)</CardDescription>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {repairs.map((r) => (
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
                  <p className="font-extrabold text-base text-foreground">GHS {r.estimatedCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                  <button onClick={() => toggleStatus(r.id)} className="text-xs cursor-pointer hover:underline font-semibold flex items-center gap-1 justify-end mt-0.5">
                    {r.status === "COMPLETED" && <span className="text-teal-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Completed</span>}
                    {r.status === "IN_PROGRESS" && <span className="text-amber-600 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> In Progress</span>}
                    {r.status === "PENDING" && <span className="text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Pending</span>}
                  </button>
                </div>

                <Button size="icon" variant="ghost" onClick={() => deleteItem(r.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer">
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
