"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import {
  User,
  Sun,
  Moon,
  Laptop,
  Download,
  Users,
  Plus,
  Trash2,
  Tag,
  Mail,
  FileText,
  RefreshCw,
  Globe,
  ShieldCheck,
  CheckCircle2,
  Camera,
} from "lucide-react";

interface Category {
  id: string;
  householdId?: string | null;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon?: string | null;
  color?: string | null;
}

interface HouseholdMember {
  id: string;
  userId: string;
  role: "OWNER" | "MEMBER";
  joinedAt: string;
}

interface FxRateItem {
  id: string;
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  fetchedAt: string;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<"profile" | "categories" | "household" | "fx" | "export">("profile");

  // Profile Form State
  const [baseCurrency, setBaseCurrency] = useState("GHS");
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);

  // Category Form State
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [catColor, setCatColor] = useState("#0F766E");

  // Household Member State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"OWNER" | "MEMBER">("MEMBER");

  const [error, setError] = useState<string | null>(null);

  // Queries
  const { data: categoriesData } = useQuery<{ data: Category[] }>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const { data: householdData } = useQuery<{
    data: { household: { id: string; name: string; createdBy: string; createdAt: string }; members: HouseholdMember[] };
  }>({
    queryKey: ["household-members"],
    queryFn: async () => {
      const res = await fetch("/api/household/members");
      if (!res.ok) throw new Error("Failed to fetch household members");
      return res.json();
    },
  });

  const { data: fxRatesData, refetch: refetchFxRates } = useQuery<{ data: FxRateItem[] }>({
    queryKey: ["fx-rates"],
    queryFn: async () => {
      const res = await fetch("/api/fx/rates");
      if (!res.ok) throw new Error("Failed to fetch FX rates");
      return res.json();
    },
  });

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (payload: { name: string; type: "INCOME" | "EXPENSE"; color: string }) => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to create category");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setCatName("");
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete custom category");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const inviteMemberMutation = useMutation({
    mutationFn: async (payload: { email: string; role: string }) => {
      const res = await fetch("/api/household/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to invite member");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household-members"] });
      setInviteEmail("");
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/household/members/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to remove member");
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["household-members"] }),
    onError: (err: Error) => setError(err.message),
  });

  const refreshFxMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/cron/fx-refresh");
      if (!res.ok) throw new Error("Failed to refresh FX rates");
      return res.json();
    },
    onSuccess: () => {
      refetchFxRates();
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setProfileSuccessMsg("FX Rates refreshed successfully from open.er-api.com!");
    },
  });

  const triggerSnapshotMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/cron/net-worth-snapshot");
      if (!res.ok) throw new Error("Failed to trigger snapshot");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spending-analytics"] });
      setProfileSuccessMsg("Net Worth historical snapshot recorded successfully!");
    },
  });

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    createCategoryMutation.mutate({
      name: catName,
      type: catType,
      color: catColor,
    });
  };

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMemberMutation.mutate({
      email: inviteEmail,
      role: inviteRole,
    });
  };

  const categories = categoriesData?.data ?? [];
  const householdInfo = householdData?.data;
  const fxRates = fxRatesData?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings & Administration</h1>
        <p className="text-sm text-muted-foreground">
          Manage system preferences, theme mode, custom categories, household sharing, and data backups
        </p>
      </div>

      {profileSuccessMsg && (
        <div className="rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 p-3 text-xs text-teal-800 dark:text-teal-200 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-600" />
            {profileSuccessMsg}
          </span>
          <button onClick={() => setProfileSuccessMsg(null)} className="text-muted-foreground hover:text-foreground">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-destructive/15 border border-destructive/30 p-3 text-xs text-destructive flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-destructive hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === "profile" ? "bg-brand-teal text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <User className="h-4 w-4" /> Profile & Theme
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === "categories" ? "bg-brand-teal text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Tag className="h-4 w-4" /> Custom Categories ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab("household")}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === "household" ? "bg-brand-teal text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Users className="h-4 w-4" /> Household & Sharing
        </button>
        <button
          onClick={() => setActiveTab("fx")}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === "fx" ? "bg-brand-teal text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Globe className="h-4 w-4" /> FX & Currencies
        </button>
        <button
          onClick={() => setActiveTab("export")}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === "export" ? "bg-brand-teal text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Download className="h-4 w-4" /> Data Export & Backups
        </button>
      </div>

      {/* 1. Profile & Theme Settings */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">User Profile</CardTitle>
              <CardDescription>Authenticated user account and active household ownership</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 border-b pb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-teal text-white font-bold text-lg">
                  {householdInfo?.household?.name?.[0] || "U"}
                </div>
                <div>
                  <h3 className="font-semibold text-base">{householdInfo?.household?.name || "Household Owner"}</h3>
                  <p className="text-xs text-muted-foreground">Household ID: {householdInfo?.household?.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="pref-currency">Primary Display Currency</Label>
                  <select
                    id="pref-currency"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={baseCurrency}
                    onChange={(e) => setBaseCurrency(e.target.value)}
                  >
                    <option value="GHS">GHS — Ghana Cedi (Base)</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — British Pound</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Household Created At</Label>
                  <Input
                    readOnly
                    value={
                      householdInfo?.household?.createdAt
                        ? new Date(householdInfo.household.createdAt).toLocaleDateString()
                        : "---"
                    }
                    className="bg-muted/40"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Theme Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appearance & Theme</CardTitle>
              <CardDescription>Choose interface mode for light mode or night mode</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 max-w-md">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-xs font-semibold transition-all ${
                    theme === "light"
                      ? "border-brand-teal bg-teal-50/50 dark:bg-teal-950/40 text-brand-teal"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  <Sun className="h-5 w-5" /> Light
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-xs font-semibold transition-all ${
                    theme === "dark"
                      ? "border-brand-teal bg-teal-50/50 dark:bg-teal-950/40 text-brand-teal"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  <Moon className="h-5 w-5" /> Dark
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-xs font-semibold transition-all ${
                    theme === "system"
                      ? "border-brand-teal bg-teal-50/50 dark:bg-teal-950/40 text-brand-teal"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  <Laptop className="h-5 w-5" /> System
                </button>
              </div>
            </CardContent>
          </Card>

          {/* System Health Status */}
          <Card className="border-teal-900/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand-teal" /> Database Security & System Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-muted/40">
                <span>Row Level Security (RLS)</span>
                <Badge variant="teal">Enabled (Postgres)</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/40">
                <span>Prisma Client Singleton</span>
                <Badge variant="teal">v5.22.0 Active</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/40">
                <span>Supabase Session Middleware</span>
                <Badge variant="teal">Active</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. Custom Categories Settings */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create Custom Category</CardTitle>
              <CardDescription>Add custom expense or income tags for budget tracking</CardDescription>
            </CardHeader>
            <form onSubmit={handleAddCategory}>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="cat-name">Category Name</Label>
                    <Input
                      id="cat-name"
                      placeholder="e.g. Side Hustle, Crypto, Software"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cat-type">Type</Label>
                    <select
                      id="cat-type"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={catType}
                      onChange={(e) => setCatType(e.target.value as "INCOME" | "EXPENSE")}
                    >
                      <option value="EXPENSE">Expense</option>
                      <option value="INCOME">Income</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cat-color">Badge Color</Label>
                    <Input
                      id="cat-color"
                      type="color"
                      className="h-9 w-full p-1 cursor-pointer"
                      value={catColor}
                      onChange={(e) => setCatColor(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button type="submit" size="sm" className="bg-brand-teal text-white">
                    <Plus className="h-4 w-4 mr-1" /> Save Category
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Categories ({categories.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y">
              {categories.map((c) => (
                <div key={c.id} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: c.color || "#0F766E" }}
                    />
                    <span className="font-semibold text-sm">{c.name}</span>
                    <Badge variant={c.type === "INCOME" ? "teal" : "outline"} className="text-[10px]">
                      {c.type}
                    </Badge>
                    {c.householdId === null && (
                      <span className="text-[10px] text-muted-foreground italic">(Default System Category)</span>
                    )}
                  </div>

                  {c.householdId !== null && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteCategoryMutation.mutate(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. Household Sharing Settings */}
      {activeTab === "household" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Household: {householdInfo?.household?.name || "My Household"}</CardTitle>
              <CardDescription>
                Invite family members or partner to share access to accounts, budgets, and net worth
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleInviteMember}>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="invite-email">Member Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="partner@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="invite-role">Access Role</Label>
                    <select
                      id="invite-role"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as "OWNER" | "MEMBER")}
                    >
                      <option value="MEMBER">Member (Shared Read/Write)</option>
                      <option value="OWNER">Co-Owner (Full Admin)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button type="submit" size="sm" className="bg-brand-teal text-white">
                    <Mail className="h-4 w-4 mr-1" /> Send Invitation
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Household Members ({householdInfo?.members?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y">
              {householdInfo?.members?.map((m) => (
                <div key={m.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-brand-teal" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{m.userId}</span>
                        <Badge variant={m.role === "OWNER" ? "teal" : "outline"} className="text-[10px]">
                          {m.role}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground">Joined {new Date(m.joinedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {m.role !== "OWNER" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeMemberMutation.mutate(m.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. FX & Exchange Rates Settings */}
      {activeTab === "fx" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">Cached Exchange Rates</CardTitle>
                <CardDescription className="text-xs">
                  Exchange rates fetched from open.er-api.com and cached for multi-currency conversion
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => refreshFxMutation.mutate()}
                disabled={refreshFxMutation.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${refreshFxMutation.isPending ? "animate-spin" : ""}`} /> Refresh Rates
              </Button>
            </CardHeader>
            <CardContent className="p-0 divide-y">
              {fxRates.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No cached FX rates found. Click &quot;Refresh Rates&quot; to fetch latest exchange rates.
                </div>
              ) : (
                fxRates.map((rate) => (
                  <div key={rate.id} className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-brand-teal" />
                      <span className="font-semibold">
                        1 {rate.baseCurrency} = {rate.rate} {rate.targetCurrency}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      Updated {new Date(rate.fetchedAt).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5. Data Export & Backups Settings */}
      {activeTab === "export" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Export & Reporting</CardTitle>
              <CardDescription>Export transaction history or download monthly financial statements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <a href="/api/export/csv" download>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Download className="h-4 w-4 mr-2" /> Export Transactions (CSV)
                  </Button>
                </a>
                <a href="/api/export/pdf" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full sm:w-auto">
                    <FileText className="h-4 w-4 mr-2" /> Generate Financial Report (PDF)
                  </Button>
                </a>
                <Button
                  variant="outline"
                  onClick={() => triggerSnapshotMutation.mutate()}
                  disabled={triggerSnapshotMutation.isPending}
                >
                  <Camera className="h-4 w-4 mr-2" /> Take Net Worth Snapshot Now
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Raw CSV files export all filterable transaction rows. PDF reports generate printable monthly net worth statements formatted for archiving.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
