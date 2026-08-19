"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Wallet, Archive } from "lucide-react";

interface Account {
  id: string;
  name: string;
  type: string;
  currency: string;
  currentBalance: number;
  institution?: string;
  isArchived: boolean;
}

interface NewAccountPayload {
  name: string;
  type: string;
  currency: string;
  openingBalance: number;
  institution?: string | null;
}

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("BANK");
  const [currency, setCurrency] = useState("GHS");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [institution, setInstitution] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: accountsData, isLoading } = useQuery<{ data: Account[] }>({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      return res.json();
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: async (newAccountData: NewAccountPayload) => {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAccountData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to create account");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setIsAdding(false);
      setName("");
      setOpeningBalance("0");
      setInstitution("");
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const archiveAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to archive account");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    createAccountMutation.mutate({
      name,
      type,
      currency,
      openingBalance: parseFloat(openingBalance) || 0,
      institution: institution || null,
    });
  };

  const accounts = accountsData?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Manage your bank accounts, mobile money wallets, investments, and cash
          </p>
        </div>
        <Button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-brand-teal text-white hover:bg-brand-teal/90"
        >
          <Plus className="h-4 w-4 mr-2" /> {isAdding ? "Cancel" : "Add Account"}
        </Button>
      </div>

      {/* Add Account Form Drawer/Card */}
      {isAdding && (
        <Card className="border-brand-teal/30">
          <CardHeader>
            <CardTitle>Create New Account</CardTitle>
            <CardDescription>Enter details to track a new balance</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-xs text-destructive">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="account-name">Account Name</Label>
                  <Input
                    id="account-name"
                    placeholder="e.g. MTN MoMo, Ecobank Savings"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="account-type">Account Type</Label>
                  <select
                    id="account-type"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="BANK">Bank Account</option>
                    <option value="SAVINGS">Savings Account</option>
                    <option value="MOBILE_MONEY">MTN Mobile Money (MoMo)</option>
                    <option value="TELECEL_CASH">Telecel Cash</option>
                    <option value="CASH">Cash</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="account-currency">Currency</Label>
                  <select
                    id="account-currency"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="GHS">GHS (Ghana Cedi)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="GBP">GBP (British Pound)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="opening-balance">Opening Balance</Label>
                  <Input
                    id="opening-balance"
                    type="number"
                    step="0.01"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="institution">Institution / Provider (Optional)</Label>
                  <Input
                    id="institution"
                    placeholder="e.g. Ecobank, MTN, Fidelity"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-brand-teal text-white hover:bg-brand-teal/90"
                  disabled={createAccountMutation.isPending}
                >
                  {createAccountMutation.isPending ? "Creating..." : "Save Account"}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* Account List Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-32 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-800 mb-3">
            <Wallet className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No Accounts Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Get started by adding your bank account, mobile money wallet, or cash balance.
          </p>
          <Button onClick={() => setIsAdding(true)} className="bg-brand-teal text-white">
            Add Your First Account
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <Card key={account.id} className="relative group">
              <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{account.name}</CardTitle>
                  <CardDescription className="text-xs capitalize mt-0.5">
                    {account.institution ? `${account.institution} • ` : ""}
                    {account.type.replace("_", " ").toLowerCase()}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="teal">{account.currency}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Archive ${account.name}?`)) {
                        archiveAccountMutation.mutate(account.id);
                      }
                    }}
                    title="Archive Account"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <p className="text-2xl font-bold tracking-tight">
                  {account.currency}{" "}
                  {Number(account.currentBalance).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
