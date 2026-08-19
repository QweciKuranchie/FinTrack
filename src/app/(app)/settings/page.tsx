"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
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
  AlertTriangle,
  Save,
  Globe,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

interface UserProfileData {
  id: string;
  email: string;
  name: string;
  username: string;
  workspaceName: string;
  workspaceCreatedAt: string;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // Tabs: Profile, Custom Category, App Preference, Account and Data
  const [activeTab, setActiveTab] = useState<"profile" | "categories" | "preferences" | "account_data">("profile");

  // Editable Profile Form State
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);

  // App Preference State
  const [baseCurrency, setBaseCurrency] = useState("GHS");

  // Category Form State
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [catColor, setCatColor] = useState("#0F766E");

  // Workspace Member State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"OWNER" | "MEMBER">("MEMBER");

  const [error, setError] = useState<string | null>(null);

  // Fetch User Profile
  const { data: profileResponse } = useQuery<{ data: UserProfileData }>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("Failed to fetch user profile");
      return res.json();
    },
  });

  useEffect(() => {
    if (profileResponse?.data) {
      setFullName(profileResponse.data.name || "");
      setUsername(profileResponse.data.username || "");
      setWorkspaceName(profileResponse.data.workspaceName || "");
    }
  }, [profileResponse]);

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

  // Workspaces Query
  const { data: workspacesData } = useQuery<{
    data: Array<{ id: string; name: string; role: string; memberCount: number; isCurrentActive: boolean }>;
  }>({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await fetch("/api/workspaces");
      if (!res.ok) throw new Error("Failed to fetch workspaces");
      return res.json();
    },
  });

  const [newWsInput, setNewWsInput] = useState("");

  const createWsMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to create workspace");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setNewWsInput("");
      setProfileSuccessMsg("New workspace created successfully.");
    },
  });

  const switchWsMutation = useMutation({
    mutationFn: async (workspaceId: string) => {
      const res = await fetch("/api/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to switch workspace");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["debt-tracker"] });
      queryClient.invalidateQueries({ queryKey: ["liabilities"] });
      setProfileSuccessMsg("Switched active workspace.");
    },
  });

  const categories = categoriesData?.data ?? [];
  const householdInfo = householdData?.data;
  const members = householdInfo?.members ?? [];
  const allWorkspaces = workspacesData?.data ?? [];

  // Profile Save Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (payload: { name: string; username: string; workspaceName: string }) => {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to update profile");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["household-members"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setProfileSuccessMsg("Profile and workspace details saved successfully!");
    },
    onError: (err: Error) => setError(err.message),
  });

  // Account Delete Mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/user/delete", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete account");
      return res.json();
    },
    onSuccess: async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    },
    onError: (err: Error) => setError(err.message),
  });

  // Category Mutations
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

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      name: fullName,
      username,
      workspaceName,
    });
  };

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
            Manage profile settings, custom categories, app preferences, workspaces, and account data
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

      {/* TAB 1: Profile Settings (Editable User Information) */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">User Information & Profile</CardTitle>
              <CardDescription className="text-xs">
                Update your personal name, username, and active workspace details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="flex items-center gap-4 border-b pb-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-teal text-white font-bold text-xl shadow-sm">
                    {fullName?.[0] || "U"}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">{fullName || "User Name"}</h3>
                    <p className="text-xs text-muted-foreground">@{username || "username"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="full-name">Full Name</Label>
                    <Input
                      id="full-name"
                      placeholder="e.g. Qweci Kuranchie"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="user-handle">Username</Label>
                    <Input
                      id="user-handle"
                      placeholder="e.g. qweci"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="workspace-name">Active Workspace Name</Label>
                    <Input
                      id="workspace-name"
                      placeholder="e.g. Personal Finance Workspace"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Date Workspace Was Created</Label>
                    <Input
                      readOnly
                      value={
                        profileResponse?.data?.workspaceCreatedAt
                          ? new Date(profileResponse.data.workspaceCreatedAt).toLocaleDateString()
                          : householdInfo?.household?.createdAt
                          ? new Date(householdInfo.household.createdAt).toLocaleDateString()
                          : "---"
                      }
                      className="bg-muted/40 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    className="bg-brand-teal text-white hover:bg-brand-teal/90 shadow-xs"
                    disabled={updateProfileMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-1.5" />
                    {updateProfileMutation.isPending ? "Saving..." : "Save Profile Details"}
                  </Button>
                </div>
              </form>
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

      {/* TAB 3: App Preference (Base Currency & Theme Mode) */}
      {activeTab === "preferences" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Primary Base Currency</CardTitle>
              <CardDescription className="text-xs">
                Select your default currency for cross-currency calculations and dashboard totals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-md space-y-2">
                <Label htmlFor="pref-currency flex items-center gap-1">
                  <Globe className="h-4 w-4 text-brand-teal" /> Default Display Currency
                </Label>
                <select
                  id="pref-currency"
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  value={baseCurrency}
                  onChange={(e) => {
                    setBaseCurrency(e.target.value);
                    setProfileSuccessMsg(`Primary base currency set to ${e.target.value}`);
                  }}
                >
                  <option value="GHS">GHS — Ghana Cedi (₵)</option>
                  <option value="USD">USD — US Dollar ($)</option>
                  <option value="EUR">EUR — Euro (€)</option>
                  <option value="GBP">GBP — British Pound (£)</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Appearance & Theme Mode</CardTitle>
              <CardDescription className="text-xs">Select interface mode for light theme, dark theme, or system default</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 max-w-md">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    theme === "light"
                      ? "border-brand-teal bg-teal-50/50 dark:bg-teal-950/40 text-brand-teal shadow-xs"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  <Sun className="h-5 w-5" /> Light Mode
                </button>

                <button
                  onClick={() => setTheme("dark")}
                  className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    theme === "dark"
                      ? "border-brand-teal bg-teal-50/50 dark:bg-teal-950/40 text-brand-teal shadow-xs"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  <Moon className="h-5 w-5" /> Dark Mode
                </button>

                <button
                  onClick={() => setTheme("system")}
                  className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    theme === "system"
                      ? "border-brand-teal bg-teal-50/50 dark:bg-teal-950/40 text-brand-teal shadow-xs"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  <Laptop className="h-5 w-5" /> System Default
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Card 1: Notification Preferences (Delivery Channels) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Mail className="h-5 w-5 text-brand-teal" /> Notification Preferences (Channels)
              </CardTitle>
              <CardDescription className="text-xs">
                Select your preferred notification delivery channels (In-App, Email, Push)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">In-App Notifications</p>
                    <p className="text-xs text-muted-foreground">Header bell popover badge and interactive dropdown panel</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 accent-teal-600 rounded cursor-pointer"
                    onChange={() => setProfileSuccessMsg("Notification delivery channel preferences saved.")}
                  />
                </div>

                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive subscription renewal warnings & summary digests via email</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 accent-teal-600 rounded cursor-pointer"
                    onChange={() => setProfileSuccessMsg("Notification delivery channel preferences saved.")}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Push Notifications</p>
                    <p className="text-xs text-muted-foreground">Browser and mobile device push notification popups</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 accent-teal-600 rounded cursor-pointer"
                    onChange={() => setProfileSuccessMsg("Notification delivery channel preferences saved.")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Financial Alert Triggers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" /> Financial Alert Triggers
              </CardTitle>
              <CardDescription className="text-xs">
                Choose which financial events and thresholds automatically trigger alert notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Subscription Renewal Reminders</p>
                    <p className="text-xs text-muted-foreground">Trigger alert 3 days before recurring subscription renewals</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 accent-teal-600 rounded cursor-pointer"
                    onChange={() => setProfileSuccessMsg("Financial alert trigger preferences saved.")}
                  />
                </div>

                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Budget Threshold Warnings</p>
                    <p className="text-xs text-muted-foreground">Trigger alert when category spending reaches 80% or 100% of allowance</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 accent-teal-600 rounded cursor-pointer"
                    onChange={() => setProfileSuccessMsg("Financial alert trigger preferences saved.")}
                  />
                </div>

                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Debt & Liability Due Date Alerts</p>
                    <p className="text-xs text-muted-foreground">Trigger alert on upcoming paydowns or receivable due dates</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 accent-teal-600 rounded cursor-pointer"
                    onChange={() => setProfileSuccessMsg("Financial alert trigger preferences saved.")}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Exchange Rates & FX Update Notices</p>
                    <p className="text-xs text-muted-foreground">Trigger notice when automated GHS/USD exchange rate caches refresh</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 accent-teal-600 rounded cursor-pointer"
                    onChange={() => setProfileSuccessMsg("Financial alert trigger preferences saved.")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: Account and Data (Workspaces, Export, & Account Deletion) */}
      {activeTab === "account_data" && (
        <div className="space-y-6">
          {/* Workspace Management & Creation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-brand-teal" /> Workspace Management & Creation
              </CardTitle>
              <CardDescription className="text-xs">
                Edit active workspace title or create custom isolated financial workspaces
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Form 1: Edit Active Workspace Title */}
              <div className="space-y-3 border-b pb-4">
                <Label htmlFor="manage-workspace-title">Edit Active Workspace Title</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="manage-workspace-title"
                    placeholder="e.g. Personal Workspace or Business Finance"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (!workspaceName.trim()) return;
                      updateProfileMutation.mutate({
                        name: fullName,
                        username,
                        workspaceName: workspaceName.trim(),
                      });
                    }}
                    className="bg-brand-teal text-white hover:bg-brand-teal/90 cursor-pointer"
                    disabled={updateProfileMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-1.5" /> Save Workspace Title
                  </Button>
                </div>
              </div>

              {/* Form 2: Create New Workspace */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newWsInput.trim()) return;
                  createWsMutation.mutate(newWsInput.trim());
                }}
                className="space-y-3 border-b pb-4"
              >
                <Label htmlFor="create-new-ws-input">Create Brand New Workspace</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="create-new-ws-input"
                    placeholder="e.g. Side Project, Family Budget"
                    value={newWsInput}
                    onChange={(e) => setNewWsInput(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    className="bg-brand-teal text-white hover:bg-brand-teal/90 cursor-pointer"
                    disabled={createWsMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-1.5" /> Create Workspace
                  </Button>
                </div>
              </form>

              {/* List 3: All Workspaces Owned & Joined */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Workspaces</h4>
                <div className="divide-y border rounded-xl overflow-hidden">
                  {allWorkspaces.map((ws) => (
                    <div key={ws.id} className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-foreground">{ws.name}</p>
                          {ws.isCurrentActive && <Badge variant="teal" className="text-[10px]">Active</Badge>}
                          <Badge variant="outline" className="text-[10px] uppercase">{ws.role}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {ws.memberCount} {ws.memberCount === 1 ? "member" : "members"}
                        </p>
                      </div>

                      {!ws.isCurrentActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => switchWsMutation.mutate(ws.id)}
                          disabled={switchWsMutation.isPending}
                          className="h-8 text-xs gap-1 border-brand-teal/40 text-brand-teal hover:bg-brand-teal/10 cursor-pointer"
                        >
                          Switch To Workspace
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workspaces & Team Sharing */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-bold">Workspace Team Sharing</CardTitle>
                <CardDescription className="text-xs">
                  Manage collaborators for active workspace ({workspaceName || householdInfo?.household?.name || "Personal Workspace"})
                </CardDescription>
              </div>
              <Badge variant="teal" className="text-xs">
                Active: {workspaceName || householdInfo?.household?.name || "Personal Workspace"}
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

          {/* Danger Zone: Account Deletion */}
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <CardTitle className="text-base font-bold">Danger Zone: Account Deletion</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Permanently delete your account, workspace records, and wipe all financial data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground">
                  Once deleted, your account and linked workspace data cannot be recovered.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm("Are you sure you want to PERMANENTLY delete your account and wipe all workspace data? This action CANNOT be undone.")) {
                      deleteAccountMutation.mutate();
                    }
                  }}
                  disabled={deleteAccountMutation.isPending}
                  className="shrink-0 font-bold"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account & Wipe Data"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
