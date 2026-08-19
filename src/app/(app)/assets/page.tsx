"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Plus,
  Trash2,
  Building,
  Car,
  TrendingUp,
  Coins,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface Asset {
  id: string;
  name: string;
  type: "PROPERTY" | "VEHICLE" | "INVESTMENT" | "OTHER";
  currentValue: number;
  currency: string;
  lastValuedAt: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export default function AssetsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 10;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState<"PROPERTY" | "VEHICLE" | "INVESTMENT" | "OTHER">("PROPERTY");
  const [currentValue, setCurrentValue] = useState("");
  const [currency, setCurrency] = useState("GHS");

  // Fetch real-time assets with pagination
  const { data: assetsResponse, isLoading, isError } = useQuery<{
    data: Asset[];
    pagination?: PaginationMeta;
  }>({
    queryKey: ["assets", page, limit],
    queryFn: async () => {
      const res = await fetch(`/api/assets?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch assets");
      return res.json();
    },
  });

  const assets = assetsResponse?.data ?? [];
  const pagination = assetsResponse?.pagination ?? { page: 1, limit: 10, totalCount: 0, totalPages: 1 };

  // Calculate Asset Totals
  const totalAssetsValue = assets.reduce((sum, a) => sum + Number(a.currentValue || 0), 0);

  const realEstateValue = assets
    .filter((a) => a.type === "PROPERTY")
    .reduce((sum, a) => sum + Number(a.currentValue || 0), 0);

  const vehiclesValue = assets
    .filter((a) => a.type === "VEHICLE")
    .reduce((sum, a) => sum + Number(a.currentValue || 0), 0);

  const investmentsValue = assets
    .filter((a) => a.type === "INVESTMENT" || a.type === "OTHER")
    .reduce((sum, a) => sum + Number(a.currentValue || 0), 0);

  // Create Asset Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; type: string; currentValue: number; currency: string }) => {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create asset");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setIsAddModalOpen(false);
      setName("");
      setCurrentValue("");
    },
  });

  // Delete Asset Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/assets/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete asset");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !currentValue) return;

    createMutation.mutate({
      name,
      type,
      currentValue: parseFloat(currentValue),
      currency,
    });
  };

  const getAssetIcon = (assetType: string) => {
    switch (assetType) {
      case "PROPERTY":
        return <Building className="h-5 w-5 text-teal-600 dark:text-teal-400" />;
      case "VEHICLE":
        return <Car className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      case "INVESTMENT":
        return <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      default:
        return <Coins className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <LineChart className="h-7 w-7 text-brand-teal" /> Asset Portfolio
          </h1>
          <p className="text-sm text-muted-foreground">
            Track real estate, vehicles, investments, and physical assets
          </p>
        </div>

        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-brand-teal text-white hover:bg-brand-teal/90 shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Asset
        </Button>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-brand-teal/40 transition-colors">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Assets Value
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
              <LineChart className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-2xl font-extrabold tracking-tight text-teal-600 dark:text-teal-400">
              GHS {totalAssetsValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Sum of all valued assets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Real Estate
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              <Building className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-2xl font-bold tracking-tight text-foreground">
              GHS {realEstateValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Properties & Land</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Vehicles
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <Car className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-2xl font-bold tracking-tight text-foreground">
              GHS {vehiclesValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Automobiles & Transports</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Investments & Other
            </CardDescription>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
              <Coins className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-2xl font-bold tracking-tight text-foreground">
              GHS {investmentsValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Stocks, Bonds & Other Items</p>
          </CardContent>
        </Card>
      </div>

      {/* Real-Time Assets List Card with Pagination */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Asset Holdings List</CardTitle>
              <CardDescription className="text-xs">
                Real-time database assets with pagination
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {pagination.totalCount} items
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-brand-teal" />
              <span className="text-sm">Loading assets...</span>
            </div>
          ) : isError ? (
            <div className="p-6 text-center text-sm text-destructive">
              Failed to load asset records.
            </div>
          ) : assets.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Building className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-semibold">No assets added yet.</p>
              <p className="text-xs mt-1">Click &quot;Add Asset&quot; to log your first property or vehicle.</p>
            </div>
          ) : (
            assets.map((asset) => (
              <div key={asset.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted border">
                    {getAssetIcon(asset.type)}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{asset.name}</h4>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">
                      {asset.type.toLowerCase()} • Valued on {new Date(asset.lastValuedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-extrabold text-base text-teal-600 dark:text-teal-400">
                      {asset.currency} {Number(asset.currentValue).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Delete asset ${asset.name}?`)) {
                        deleteMutation.mutate(asset.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total items)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="h-8 gap-1"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Asset Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-card border p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95">
            <h3 className="text-xl font-bold mb-1">Add New Asset</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Record property, vehicles, or physical asset valuations
            </p>

            <form onSubmit={handleCreateAsset} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Asset Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. 4-Bedroom House in East Legon or Toyota RAV4"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="type">Asset Type</Label>
                  <select
                    id="type"
                    value={type}
                    onChange={(e) => setType(e.target.value as "PROPERTY" | "VEHICLE" | "INVESTMENT" | "OTHER")}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="PROPERTY">Property / Real Estate</option>
                    <option value="VEHICLE">Vehicle</option>
                    <option value="INVESTMENT">Investment / Stocks</option>
                    <option value="OTHER">Other Valuable Asset</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="GHS">GHS (₵)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="currentValue">Current Valuation Amount</Label>
                <Input
                  id="currentValue"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-brand-teal text-white hover:bg-brand-teal/90"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Saving..." : "Save Asset"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
