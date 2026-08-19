"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Plus, Check, Trash2 } from "lucide-react";

interface NeedItem {
  id: string;
  title: string;
  category: "MUST_HAVE" | "HIGH_PRIORITY" | "MEDIUM" | "WANT";
  estimatedCost: number;
  isFulfilled: boolean;
  notes?: string;
}

export default function NeedsPage() {
  const [needs, setNeeds] = useState<NeedItem[]>([
    { id: "1", title: "Monthly Grocery Allowance", category: "MUST_HAVE", estimatedCost: 1500, isFulfilled: true, notes: "Essential food supply" },
    { id: "2", title: "Health Insurance Premium", category: "MUST_HAVE", estimatedCost: 400, isFulfilled: true, notes: "Medical cover renewal" },
    { id: "3", title: "Ergonomic Office Chair", category: "HIGH_PRIORITY", estimatedCost: 850, isFulfilled: false, notes: "Back posture relief" },
    { id: "4", title: "Noise Canceling Headphones", category: "WANT", estimatedCost: 1200, isFulfilled: false, notes: "Travel & focus" },
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<"MUST_HAVE" | "HIGH_PRIORITY" | "MEDIUM" | "WANT">("MUST_HAVE");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [notes, setNotes] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !estimatedCost) return;

    const newItem: NeedItem = {
      id: Date.now().toString(),
      title,
      category,
      estimatedCost: parseFloat(estimatedCost),
      isFulfilled: false,
      notes: notes || undefined,
    };

    setNeeds([newItem, ...needs]);
    setIsAdding(false);
    setTitle("");
    setEstimatedCost("");
    setNotes("");
  };

  const toggleFulfilled = (id: string) => {
    setNeeds(needs.map((n) => (n.id === id ? { ...n, isFulfilled: !n.isFulfilled } : n)));
  };

  const deleteItem = (id: string) => {
    setNeeds(needs.filter((n) => n.id !== id));
  };

  const totalNeedsCost = needs.reduce((sum, n) => sum + n.estimatedCost, 0);
  const fulfilledCost = needs.filter((n) => n.isFulfilled).reduce((sum, n) => sum + n.estimatedCost, 0);

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
                <Button type="submit" className="bg-brand-teal text-white hover:bg-brand-teal/90">Save Item</Button>
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
          {needs.map((n) => (
            <div key={n.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <button onClick={() => toggleFulfilled(n.id)} className={`h-6 w-6 rounded border flex items-center justify-center cursor-pointer transition-colors ${n.isFulfilled ? "bg-brand-teal border-brand-teal text-white" : "border-input hover:border-brand-teal"}`}>
                  {n.isFulfilled && <Check className="h-4 w-4" />}
                </button>
                <div>
                  <h4 className={`font-bold text-base ${n.isFulfilled ? "line-through text-muted-foreground" : "text-foreground"}`}>{n.title}</h4>
                  <p className="text-xs text-muted-foreground">{n.notes || "No notes"}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-extrabold text-base text-foreground">GHS {n.estimatedCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                  <Badge variant={n.category === "MUST_HAVE" ? "destructive" : n.category === "HIGH_PRIORITY" ? "teal" : "outline"} className="text-[10px] mt-0.5">
                    {n.category.replace("_", " ")}
                  </Badge>
                </div>

                <Button size="icon" variant="ghost" onClick={() => deleteItem(n.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer">
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
