"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: Array<{ id: string; name: string; currency: string }>;
}

export function QuickTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  accounts,
}: QuickTransactionModalProps) {
  const [type, setType] = useState<"EXPENSE" | "INCOME" | "TRANSFER">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }

    if (!accountId) {
      setError("Please select an account");
      return;
    }

    setLoading(true);
    try {
      const selectedAccount = accounts.find((a) => a.id === accountId);
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          categoryId: categoryId || null,
          amount: numericAmount,
          currency: selectedAccount?.currency || "GHS",
          type,
          description: description || null,
          date,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to log transaction");
      }

      // Reset form & trigger callbacks
      setAmount("");
      setDescription("");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl border">
        <h2 className="text-xl font-bold tracking-tight mb-1">Quick Log Transaction</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Add an income, expense, or transfer transaction
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-destructive/15 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-3 gap-2">
            {(["EXPENSE", "INCOME", "TRANSFER"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${
                  type === t
                    ? "bg-brand-teal text-white border-brand-teal"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => setType(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {/* Account */}
          <div className="space-y-1">
            <Label htmlFor="account">Account</Label>
            <select
              id="account"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">-- Optional Category --</option>
              {categoriesData?.data?.map((cat: { id: string; name: string }) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="description">Note / Description</Label>
            <Input
              id="description"
              type="text"
              placeholder="Lunch, Groceries, Uber..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-brand-teal text-white hover:bg-brand-teal/90"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Transaction"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
