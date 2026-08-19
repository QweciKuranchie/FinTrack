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
  Plus,
  Trash2,
  Tag,
  Mail,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Camera,
  Settings2,
  Database,
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

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();

  // Tabs: Profile, Custom Category, App Preference, Account and Data
  const [activeTab, setActiveTab] = useState<"profile" | "categories" | "preferences" | "account_data">("profile");

  // Profile Form State
  const [baseCurrency, setBaseCurrency] = useState("GHS");
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);

  // Category Form State
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [catColor, setCatColor] = useState("#0F766E");

  // Workspace Member State
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
      if (!res.ok) throw new Error("Failed to fetch workspace info");
      return res.json();
    },
  });

  const categories = categoriesData?.data ?? [];
  const householdInfo = householdData?.data;
  const members = householdInfo?.members ?? [];

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
      setProfileSuccessMsg("Custom category created successfully!");
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete category");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
    onError: (err: Error) => setError(err.message),
  });

  const inviteMemberMutation = useMutation({
    mutationFn: async (payload: { email: string; role: "OWNER" | "MEMBER" }) => {
      const res = await fetch("/api/household/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to invite workspace member");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household-members"] });
      setInviteEmail("");
      setProfileSuccessMsg("Workspace invitation sent successfully!");
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

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <Settings2 className="h-7 w-7 text-brand-teal" /> Settings & Preferences
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage profile settings, custom categories, theme preferences, workspaces, and data backups
          </p>
        </div>
      </div>

      {profileSuccessMsg && (
        <div className="p-3 bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{profileSuccessMsg}</span>
          </div>
          <button onClick={() => setProfileSuccessMsg(null)} className="font-bold hover:underline">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-destructive hover:underline font-bold">
            ×
          </button>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === "profile" ? "bg-brand-teal text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <User className="h-4 w-4" /> Profile
        </button>

        <button
          onClick={() => setActiveTab("categories")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === "categories" ? "bg-brand-teal text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Tag className="h-4 w-4" /> Custom Category ({categories.length})
        </button>

        <button
          onClick={() => setActiveTab("preferences")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === "preferences" ? "bg-brand-teal text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Sun className="h-4 w-4" /> App Preference
        </button>

        <button
          onClick={() => setActiveTab("account_data")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === "account_data" ? "bg-brand-teal text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Database className="h-4 w-4" /> Account and Data
        </button>
      </div>

      {/* TAB 1: Profile Settings */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">User Profile Information</CardTitle>
              <CardDescription className="text-xs">Your personal account details and primary currency preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 border-b pb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-teal text-white font-bold text-lg">
                  {householdInfo?.household?.name?.[0] || "U"}
                </div>
                <div>
                  <h3 className="font-semibold text-base">{householdInfo?.household?.name || "User Account"}</h3>
                  <p className="text-xs text-muted-foreground">Active Workspace: {householdInfo?.household?.name || "Personal Workspace"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="pref-currency">Primary Base Currency</Label>
                  <select
                    id="pref-currency"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={baseCurrency}
                    onChange={(e) => setBaseCurrency(e.target.value)}
                  >
                    <option value="GHS">GHS — Ghana Cedi (₵)</option>
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                    <option value="GBP">GBP — British Pound (£)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Workspace Created At</Label>
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
        </div>
      )}

      {/* TAB 2: Custom Category Settings */}
      {activeTab === "categories" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Add New Custom Category</CardTitle>
              <CardDescription className="text-xs">Create custom spending or income tags for transaction logging</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCategory} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="cat-name">Category Name</Label>
                    <Input
                      id="cat-name"
                      placeholder="e.g. Freelancing, Software"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cat-type">Category Type</Label>
                    <select
                      id="cat-type"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      value={catType}
                      onChange={(e) => setCatType(e.target.value as "INCOME" | "EXPENSE")}
                    >
                      <option value="EXPENSE">Expense Category</option>
                      <option value="INCOME">Income Category</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cat-color">Badge Color Accent</Label>
                    <div className="flex gap-2">
                      <Input
                        id="cat-color"
                        type="color"
                        value={catColor}
                        onChange={(e) => setCatColor(e.target.value)}
                        className="h-9 w-14 p-1 cursor-pointer"
                      />
                      <Input value={catColor} onChange={(e) => setCatColor(e.target.value)} className="h-9 font-mono text-xs" />
                    </div>
                  </div>
                </div>

                <Button type="submit" size="sm" className="bg-brand-teal text-white hover:bg-brand-teal/90">
                  <Plus className="h-4 w-4 mr-1" /> Create Category
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Category Registry</CardTitle>
              <CardDescription className="text-xs">System defaults and custom workspace categories</CardDescription>
            </CardHeader>
            <CardContent className="p-0 divide-y">
              {categories.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">No categories found.</div>
              ) : (
                categories.map((cat) => (
                  <div key={cat.id} className="p-3 flex items-center justify-between text-xs hover:bg-muted/40">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color || "#0F766E" }} />
                      <span className="font-semibold">{cat.name}</span>
                      <Badge variant={cat.type === "INCOME" ? "teal" : "secondary"} className="text-[10px]">
                        {cat.type}
                      </Badge>
                      {!cat.householdId && <span className="text-[10px] text-muted-foreground">(System Default)</span>}
                    </div>

                    {cat.householdId && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteCategoryMutation.mutate(cat.id)}
                        disabled={deleteCategoryMutation.isPending}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: App Preference */}
      {activeTab === "preferences" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Appearance & Theme Preference</CardTitle>
              <CardDescription className="text-xs">Select your preferred color theme mode across all devices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 max-w-md">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    theme === "light"
                      ? "border-brand-teal bg-teal-50/50 dark:bg-teal-950/40 text-brand-teal"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  <Sun className="h-5 w-5" /> Light Mode
                </button>

                <button
                  onClick={() => setTheme("dark")}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    theme === "dark"
                      ? "border-brand-teal bg-teal-50/50 dark:bg-teal-950/40 text-brand-teal"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  <Moon className="h-5 w-5" /> Dark Mode
                </button>

                <button
                  onClick={() => setTheme("system")}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    theme === "system"
                      ? "border-brand-teal bg-teal-50/50 dark:bg-teal-950/40 text-brand-teal"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  <Laptop className="h-5 w-5" /> System Default
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: Account and Data */}
      {activeTab === "account_data" && (
        <div className="space-y-6">
          {/* Workspaces & Team Sharing */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-bold">Workspace & Team Sharing</CardTitle>
                <CardDescription className="text-xs">
                  Manage multiple financial workspaces (Personal, Family, Business) and collaborators
                </CardDescription>
              </div>
              <Badge variant="teal" className="text-xs">
                Active: {householdInfo?.household?.name || "Personal Workspace"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleInviteMember} className="space-y-3 border-b pb-4">
                <Label htmlFor="invite-email">Invite Collaborator to Active Workspace</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <select
                    className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as "OWNER" | "MEMBER")}
                  >
                    <option value="MEMBER">Member (View & Add)</option>
                    <option value="OWNER">Owner (Full Admin)</option>
                  </select>
                  <Button type="submit" size="sm" className="bg-brand-teal text-white hover:bg-brand-teal/90">
                    <Mail className="h-4 w-4 mr-1" /> Send Invite
                  </Button>
                </div>
              </form>

              {/* Members List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Workspace Members</h4>
                <div className="divide-y border rounded-xl overflow-hidden">
                  {members.map((m) => (
                    <div key={m.id} className="p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-brand-teal" />
                        <div>
                          <p className="font-semibold text-foreground">{m.userId}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Joined {new Date(m.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{m.role}</Badge>
                        {m.role !== "OWNER" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeMemberMutation.mutate(m.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Export & Backups */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Data Export & Historical Snapshots</CardTitle>
              <CardDescription className="text-xs">Download full financial records in CSV or PDF formats</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  onClick={() => window.open("/api/export/csv", "_blank")}
                  className="h-20 flex flex-col items-center justify-center gap-1.5 border-dashed"
                >
                  <FileText className="h-5 w-5 text-brand-teal" />
                  <span className="font-semibold text-xs">Export CSV Ledger</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => window.open("/api/export/pdf", "_blank")}
                  className="h-20 flex flex-col items-center justify-center gap-1.5 border-dashed"
                >
                  <Download className="h-5 w-5 text-brand-teal" />
                  <span className="font-semibold text-xs">Export PDF Statement</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => triggerSnapshotMutation.mutate()}
                  disabled={triggerSnapshotMutation.isPending}
                  className="h-20 flex flex-col items-center justify-center gap-1.5 border-dashed"
                >
                  <Camera className="h-5 w-5 text-amber-500" />
                  <span className="font-semibold text-xs">Record Net Worth Snapshot</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
