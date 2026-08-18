"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CalendarCheck, Pause, Play } from "lucide-react";

interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  billingCycle: "WEEKLY" | "MONTHLY" | "YEARLY";
  nextRenewalDate: string;
  isActive: boolean;
  reminderDaysBefore: number;
}

interface NewSubscriptionPayload {
  name: string;
  amount: number;
  currency: string;
  billingCycle: "WEEKLY" | "MONTHLY" | "YEARLY";
  nextRenewalDate: string;
  reminderDaysBefore: number;
}

export default function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("GHS");
  const [billingCycle, setBillingCycle] = useState<"WEEKLY" | "MONTHLY" | "YEARLY">("MONTHLY");
  const [nextRenewalDate, setNextRenewalDate] = useState(new Date().toISOString().split("T")[0]);
  const [reminderDaysBefore, setReminderDaysBefore] = useState("3");
  const [error, setError] = useState<string | null>(null);

  const { data: subsData, isLoading } = useQuery<{ data: Subscription[] }>({
    queryKey: ["subscriptions"],
    queryFn: async () => {
      const res = await fetch("/api/subscriptions");
      if (!res.ok) throw new Error("Failed to fetch subscriptions");
      return res.json();
    },
  });

  const createSubMutation = useMutation({
    mutationFn: async (payload: NewSubscriptionPayload) => {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to create subscription");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setIsAdding(false);
      setName("");
      setAmount("");
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to update subscription");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  const deleteSubMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete subscription");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSubMutation.mutate({
      name,
      amount: parseFloat(amount) || 0,
      currency,
      billingCycle,
      nextRenewalDate,
      reminderDaysBefore: parseInt(reminderDaysBefore) || 3,
    });
  };

  const subscriptions = subsData?.data ?? [];

  const getDaysUntilRenewal = (renewalDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const renewal = new Date(renewalDateStr);
    renewal.setHours(0, 0, 0, 0);
    const diffMs = renewal.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">
            Track recurring services and receive email alerts before renewal dates
          </p>
        </div>
        <Button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-brand-teal text-white hover:bg-brand-teal/90 shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Subscription
        </Button>
      </div>

      {isAdding && (
        <Card className="border-teal-600/30">
          <CardHeader>
            <CardTitle className="text-base">Add Subscription</CardTitle>
            <CardDescription>Track recurring payments and set renewal email reminders</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="sub-name">Service / Subscription Name</Label>
                  <Input
                    id="sub-name"
                    placeholder="e.g. Netflix, Spotify, ChatGPT"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sub-amount">Renewal Amount</Label>
                  <Input
                    id="sub-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sub-currency">Currency</Label>
                  <select
                    id="sub-currency"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="GHS">GHS</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sub-cycle">Billing Cycle</Label>
                  <select
                    id="sub-cycle"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as "WEEKLY" | "MONTHLY" | "YEARLY")}
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                    <option value="WEEKLY">Weekly</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sub-renewal">Next Renewal Date</Label>
                  <Input
                    id="sub-renewal"
                    type="date"
                    value={nextRenewalDate}
                    onChange={(e) => setNextRenewalDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sub-lead">Remind Days Before</Label>
                  <select
                    id="sub-lead"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={reminderDaysBefore}
                    onChange={(e) => setReminderDaysBefore(e.target.value)}
                  >
                    <option value="1">1 day before</option>
                    <option value="3">3 days before</option>
                    <option value="7">7 days before</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-brand-teal text-white">
                  Save Subscription
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* Subscriptions List */}
      <Card>
        <CardContent className="p-0 divide-y">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
              Loading subscriptions...
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No active subscriptions tracked yet. Click &quot;Add Subscription&quot; to log your recurring bills.
            </div>
          ) : (
            subscriptions.map((sub) => {
              const daysLeft = getDaysUntilRenewal(sub.nextRenewalDate);
              const isImminent = daysLeft >= 0 && daysLeft <= sub.reminderDaysBefore;

              return (
                <div
                  key={sub.id}
                  className={`p-4 flex items-center justify-between hover:bg-muted/30 group transition-colors ${
                    !sub.isActive ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                      <CalendarCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{sub.name}</span>
                        {!sub.isActive && (
                          <Badge variant="outline" className="text-[10px]">
                            Paused
                          </Badge>
                        )}
                        {sub.isActive && isImminent && (
                          <Badge variant="amber" className="text-[10px]">
                            Renews in {daysLeft}d
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="capitalize">{sub.billingCycle.toLowerCase()}</span>
                        <span>•</span>
                        <span>Renews {new Date(sub.nextRenewalDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="font-bold text-sm text-right">
                      {sub.currency} {Number(sub.amount).toFixed(2)}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        toggleActiveMutation.mutate({ id: sub.id, isActive: !sub.isActive })
                      }
                      title={sub.isActive ? "Pause subscription" : "Activate subscription"}
                    >
                      {sub.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 text-brand-teal" />}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        if (confirm(`Delete subscription ${sub.name}?`)) {
                          deleteSubMutation.mutate(sub.id);
                        }
                      }}
                      title="Delete subscription"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
