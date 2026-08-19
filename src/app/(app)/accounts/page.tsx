"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Wallet, Archive, Pencil } from "lucide-react";

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
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Form State for Add / Edit
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
    onError: (err: Error) => setError(err.message),
  });

  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to update account");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setEditingAccount(null);
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
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

  const handleCreateSubmit = (e: React.FormEvent) => {
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

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    setError(null);
    updateAccountMutation.mutate({
      id: editingAccount.id,
      payload: {
        name,
        type,
        currency,
        currentBalance: parseFloat(openingBalance) || 0,
        institution: institution || null,
      },
    });
  };

  const startEdit = (acc: Account) => {
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setCurrency(acc.currency);
    setOpeningBalance(acc.currentBalance.toString());
    setInstitution(acc.institution || "");
  };

  const accounts = accountsData?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <Wallet className="h-7 w-7 text-brand-teal" /> Accounts & Wallets
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage bank accounts, mobile money wallets, savings, and cash holdings
          </p>
        </div>

        {!isAdding && !editingAccount && (
          <Button onClick={() => setIsAdding(true)} className="bg-brand-teal text-white hover:bg-brand-teal/90 shadow-xs">
            <Plus className="h-4 w-4 mr-2" /> Add Account
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-destructive hover:underline font-bold">
            ×
          </button>
        </div>
      )}

      {/* Add Account Modal Form */}
      {isAdding && (
        <Card className="border-brand-teal/30 bg-teal-50/20 dark:bg-teal-950/10">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Create New Account</CardTitle>
            <CardDescription className="text-xs">Add a new bank account or digital wallet to track</CardDescription>
          </CardHeader>
          <form onSubmit={handleCreateSubmit}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="name">Account Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Ecobank Checking, MTN MoMo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="type">Account Type</Label>
                  <select
                    id="type"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="BANK">Bank Account</option>
                    <option value="SAVINGS">Savings Account</option>
                    <option value="MOBILE_MONEY">MTN MoMo Wallet</option>
                    <option value="TELECEL_CASH">Telecel Cash Wallet</option>
                    <option value="CASH">Physical Cash</option>
                    <option value="OTHER">Other Financial Account</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="GHS">GHS — Ghana Cedi (₵)</option>
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                    <option value="GBP">GBP — British Pound (£)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="openingBalance">Opening Balance</Label>
                  <Input
                    id="openingBalance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
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

      {/* Edit Account Modal Form */}
      {editingAccount && (
        <Card className="border-brand-teal/30 bg-teal-50/20 dark:bg-teal-950/10">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Edit Account: {editingAccount.name}</CardTitle>
            <CardDescription className="text-xs">Update account details or adjust balance</CardDescription>
          </CardHeader>
          <form onSubmit={handleEditSubmit}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="edit-name">Account Name</Label>
                  <Input
                    id="edit-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-type">Account Type</Label>
                  <select
                    id="edit-type"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="BANK">Bank Account</option>
                    <option value="SAVINGS">Savings Account</option>
                    <option value="MOBILE_MONEY">MTN MoMo Wallet</option>
                    <option value="TELECEL_CASH">Telecel Cash Wallet</option>
                    <option value="CASH">Physical Cash</option>
                    <option value="OTHER">Other Financial Account</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-currency">Currency</Label>
                  <select
                    id="edit-currency"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="GHS">GHS — Ghana Cedi (₵)</option>
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                    <option value="GBP">GBP — British Pound (£)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-balance">Current Balance</Label>
                  <Input
                    id="edit-balance"
                    type="number"
                    step="0.01"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="edit-institution">Institution / Provider (Optional)</Label>
                  <Input
                    id="edit-institution"
                    placeholder="e.g. Ecobank, MTN, Fidelity"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingAccount(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-brand-teal text-white hover:bg-brand-teal/90"
                  disabled={updateAccountMutation.isPending}
                >
                  {updateAccountMutation.isPending ? "Updating..." : "Update Account"}
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
            <Card key={account.id} className="relative group hover:border-brand-teal/40 transition-colors">
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
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    onClick={() => startEdit(account)}
                    title="Edit Account"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
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
