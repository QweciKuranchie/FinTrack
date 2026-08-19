"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, ShieldCheck, Mail, Trash2, CheckCircle2, User, RefreshCw } from "lucide-react";

interface WorkspaceItem {
  id: string;
  name: string;
  role: string;
  memberCount: number;
  isCurrentActive: boolean;
}

interface MemberItem {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  userName?: string | null;
  userHandle?: string | null;
  email?: string | null;
}

export default function SharedWorkspacesPage() {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"OWNER" | "MEMBER">("MEMBER");

  // Query All Workspaces
  const { data: workspacesResponse, isLoading: isWorkspacesLoading } = useQuery<{ data: WorkspaceItem[] }>({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await fetch("/api/workspaces");
      if (!res.ok) throw new Error("Failed to fetch workspaces");
      return res.json();
    },
  });

  // Query Household Members for Active Workspace
  const { data: householdResponse, isLoading: isMembersLoading } = useQuery<{
    data: {
      household: { id: string; name: string };
      members: MemberItem[];
    };
  }>({
    queryKey: ["household-members"],
    queryFn: async () => {
      const res = await fetch("/api/household/members");
      if (!res.ok) throw new Error("Failed to fetch household members");
      return res.json();
    },
  });

  const workspaces = workspacesResponse?.data ?? [];
  const activeWorkspace = workspaces.find((w) => w.isCurrentActive) || workspaces[0];
  const members = householdResponse?.data?.members ?? [];

  // Switch Workspace Mutation
  const switchWorkspaceMutation = useMutation({
    mutationFn: async (workspaceId: string) => {
      const res = await fetch("/api/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      if (!res.ok) throw new Error("Failed to switch workspace");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["household-members"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setSuccessMsg("Switched active workspace successfully!");
    },
    onError: (err: Error) => setError(err.message),
  });

  // Create Workspace Mutation
  const createWorkspaceMutation = useMutation({
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
      setNewWorkspaceName("");
      setSuccessMsg("New workspace created successfully!");
    },
    onError: (err: Error) => setError(err.message),
  });

  // Delete Workspace Mutation
  const deleteWorkspaceMutation = useMutation({
    mutationFn: async (workspaceId: string) => {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to delete workspace");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setSuccessMsg("Workspace deleted successfully!");
    },
    onError: (err: Error) => setError(err.message),
  });

  // Invite Member Mutation
  const inviteMemberMutation = useMutation({
    mutationFn: async (payload: { email: string; role: "OWNER" | "MEMBER" }) => {
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
      setSuccessMsg("Collaborator invitation added successfully!");
    },
    onError: (err: Error) => setError(err.message),
  });

  // Remove Member Mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/household/members/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to remove member");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household-members"] });
      setSuccessMsg("Member removed from workspace.");
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    createWorkspaceMutation.mutate(newWorkspaceName.trim());
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    inviteMemberMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <Users className="h-7 w-7 text-brand-teal" /> Shared Workspaces & Team Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your personal and collaborative households, switch active contexts, and share finances with partners or family members
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="font-bold hover:underline">
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

      {/* Grid: Workspace Management + Team Sharing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Workspaces Registry & Creation */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-brand-teal" /> Your Workspaces Registry
              </CardTitle>
              <CardDescription className="text-xs">
                Switch between active households or create new custom workspaces
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Create Workspace Form */}
              <form onSubmit={handleCreateWorkspace} className="space-y-2 border-b pb-4">
                <Label htmlFor="create-ws-input" className="text-xs font-semibold">Create New Workspace</Label>
                <div className="flex gap-2">
                  <Input
                    id="create-ws-input"
                    placeholder="e.g. Side Business, Family Household..."
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    required
                  />
                  <Button type="submit" className="bg-brand-teal text-white hover:bg-brand-teal/90 shrink-0 cursor-pointer" disabled={createWorkspaceMutation.isPending}>
                    <Plus className="h-4 w-4 mr-1" /> Create
                  </Button>
                </div>
              </form>

              {/* Workspaces List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">All Owned & Joined Workspaces</h4>
                <div className="divide-y border rounded-xl overflow-hidden">
                  {isWorkspacesLoading ? (
                    <div className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-brand-teal" /> Loading workspaces...
                    </div>
                  ) : workspaces.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">No workspaces found.</div>
                  ) : (
                    workspaces.map((ws) => (
                      <div key={ws.id} className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-foreground">{ws.name}</p>
                            {ws.isCurrentActive && <Badge variant="teal" className="text-[10px]">Active Workspace</Badge>}
                            <Badge variant="outline" className="text-[10px] uppercase">{ws.role}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {ws.memberCount} {ws.memberCount === 1 ? "collaborator" : "collaborators"}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {!ws.isCurrentActive && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => switchWorkspaceMutation.mutate(ws.id)}
                              disabled={switchWorkspaceMutation.isPending}
                              className="h-8 text-xs gap-1 border-brand-teal/40 text-brand-teal hover:bg-brand-teal/10 cursor-pointer"
                            >
                              Switch Context
                            </Button>
                          )}

                          {workspaces.length > 1 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete workspace "${ws.name}"? All associated data in this workspace will be permanently removed.`)) {
                                  deleteWorkspaceMutation.mutate(ws.id);
                                }
                              }}
                              disabled={deleteWorkspaceMutation.isPending}
                              className="h-8 text-xs gap-1 border-destructive/40 text-destructive hover:bg-destructive/10 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Workspace Team Sharing & Collaborators */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-brand-teal" /> Team Collaborators & Invites
                </CardTitle>
                <CardDescription className="text-xs">
                  Manage members for active workspace ({activeWorkspace?.name || "Personal Workspace"})
                </CardDescription>
              </div>
              <Badge variant="teal" className="text-xs">
                Active: {activeWorkspace?.name || "Personal Workspace"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Invite Form */}
              <form onSubmit={handleInvite} className="space-y-3 border-b pb-4">
                <Label htmlFor="invite-email" className="text-xs font-semibold">Invite Collaborator to Active Workspace</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="partner@example.com"
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
                  <Button type="submit" size="sm" className="bg-brand-teal text-white hover:bg-brand-teal/90 shrink-0 cursor-pointer" disabled={inviteMemberMutation.isPending}>
                    <Mail className="h-4 w-4 mr-1" /> Send Invite
                  </Button>
                </div>
              </form>

              {/* Members List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Workspace Members ({members.length})</h4>
                <div className="divide-y border rounded-xl overflow-hidden">
                  {isMembersLoading ? (
                    <div className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-brand-teal" /> Loading team members...
                    </div>
                  ) : members.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">No collaborators added yet.</div>
                  ) : (
                    members.map((m) => (
                      <div key={m.id} className="p-3 flex items-center justify-between text-xs hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal/15 text-brand-teal font-bold text-xs">
                            {(m.userName?.[0] || m.userId?.[0] || "U").toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{m.userName || m.userId}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {m.email ? `${m.email} • ` : ""}Joined {new Date(m.joinedAt).toLocaleDateString()}
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
                              disabled={removeMemberMutation.isPending}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
