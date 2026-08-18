"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, Users, Plus, Trash2, Tag, Mail, FileText } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"general" | "categories" | "household" | "export">("general");

  // Category State
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

  const { data: householdData } = useQuery<{ data: { household: { name: string }; members: HouseholdMember[] } }>({
    queryKey: ["household-members"],
    queryFn: async () => {
      const res = await fetch("/api/household/members");
      if (!res.ok) throw new Error("Failed to fetch household members");
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings & Preferences</h1>
        <p className="text-sm text-muted-foreground">
          Manage currency defaults, custom categories, household sharing, and data export
        </p>
      </div>

      {/* Tabs selector */}
      <div className="flex gap-2 border-b pb-2">
        {(["general", "categories", "household", "export"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
              activeTab === tab
                ? "bg-brand-teal text-white"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* General Settings */}
      {activeTab === "general" && (
        <Card>
          <CardHeader>
            <CardTitle>General Preferences</CardTitle>
            <CardDescription>Default base currency and household display settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1 max-w-sm">
              <Label htmlFor="base-currency">Default Base Currency</Label>
              <select
                id="base-currency"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                defaultValue="GHS"
              >
                <option value="GHS">GHS — Ghana Cedi (Primary)</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </div>
            <div className="pt-2">
              <Badge variant="teal">FX Rate Refresh: Daily (open.er-api.com)</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Categories Settings */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Custom Category</CardTitle>
            </CardHeader>
            <form onSubmit={handleAddCategory}>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="cat-name">Category Name</Label>
                    <Input
                      id="cat-name"
                      placeholder="e.g. Side Hustle, Crypto, Gifts"
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
                    <Plus className="h-4 w-4 mr-1" /> Add Category
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Categories List</CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y">
              {categories.map((c) => (
                <div key={c.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">{c.name}</span>
                    <Badge variant={c.type === "INCOME" ? "teal" : "outline"} className="text-[10px]">
                      {c.type}
                    </Badge>
                    {c.householdId === null && (
                      <span className="text-[10px] text-muted-foreground italic">(Default)</span>
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

      {/* Household Sharing Settings */}
      {activeTab === "household" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Household: {householdInfo?.household?.name || "My Household"}</CardTitle>
              <CardDescription>
                Invite household members to share visibility into accounts, assets, and budgets
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
                    <Label htmlFor="invite-role">Role</Label>
                    <select
                      id="invite-role"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as "OWNER" | "MEMBER")}
                    >
                      <option value="MEMBER">Member (Shared View)</option>
                      <option value="OWNER">Co-Owner (Full Admin)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button type="submit" size="sm" className="bg-brand-teal text-white">
                    <Mail className="h-4 w-4 mr-1" /> Send Invite
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Household Members</CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y">
              {householdInfo?.members?.map((m) => (
                <div key={m.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-brand-teal" />
                    <span className="font-semibold text-sm">{m.userId}</span>
                    <Badge variant={m.role === "OWNER" ? "teal" : "outline"} className="text-[10px]">
                      {m.role}
                    </Badge>
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

      {/* Data Export Settings */}
      {activeTab === "export" && (
        <Card>
          <CardHeader>
            <CardTitle>Export Financial Data</CardTitle>
            <CardDescription>Download your transaction history or printable monthly financial report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <a href="/api/export/csv" download>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-2" /> Export All Transactions (CSV)
                </Button>
              </a>
              <a href="/api/export/pdf" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full sm:w-auto">
                  <FileText className="h-4 w-4 mr-2" /> Download Monthly Summary (PDF)
                </Button>
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              CSV export contains all raw transaction rows. PDF report generates a formatted monthly net worth statement suitable for printing or archiving.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
