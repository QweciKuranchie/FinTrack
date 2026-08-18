"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Search, Upload } from "lucide-react";
import { QuickTransactionModal } from "@/components/transactions/quick-transaction-modal";
import { CsvImportModal } from "@/components/transactions/csv-import-modal";

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  description?: string;
  date: string;
  account: { id: string; name: string; currency: string };
  category?: { id: string; name: string; icon?: string; color?: string };
}

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedType, setSelectedType] = useState("");

  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      return res.json();
    },
  });

  const { data: txnsData, isLoading, refetch } = useQuery<{ data: Transaction[] }>({
    queryKey: ["transactions", selectedAccount, selectedType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAccount) params.set("accountId", selectedAccount);
      if (selectedType) params.set("type", selectedType);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    },
  });

  const deleteTxnMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete transaction");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  const accounts = accountsData?.data ?? [];
  const transactions = (txnsData?.data ?? []).filter((txn) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      txn.description?.toLowerCase().includes(term) ||
      txn.account?.name.toLowerCase().includes(term) ||
      txn.category?.name.toLowerCase().includes(term) ||
      txn.amount.toString().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Log and review your incoming and outgoing payments
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsCsvModalOpen(true)}
            className="shadow-sm"
          >
            <Upload className="h-4 w-4 mr-2" /> Import CSV
          </Button>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-teal text-white hover:bg-brand-teal/90 shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" /> Log Transaction
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search description, account, category..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
            >
              <option value="">All Accounts</option>
              {accounts.map((a: { id: string; name: string }) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardContent className="p-0 divide-y">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
              Loading transactions...
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No transactions match your query. Click &quot;Log Transaction&quot; to create one.
            </div>
          ) : (
            transactions.map((txn) => (
              <div
                key={txn.id}
                className="p-4 flex items-center justify-between hover:bg-muted/30 group transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      txn.type === "INCOME"
                        ? "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                        : txn.type === "TRANSFER"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                        : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                    }`}
                  >
                    {txn.type === "INCOME" ? (
                      <ArrowDownLeft className="h-5 w-5" />
                    ) : txn.type === "TRANSFER" ? (
                      <ArrowLeftRight className="h-5 w-5" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight">
                      {txn.description || txn.category?.name || "Transaction"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>{txn.account?.name}</span>
                      {txn.category && (
                        <>
                          <span>•</span>
                          <Badge variant="outline" className="text-[10px] py-0">
                            {txn.category.name}
                          </Badge>
                        </>
                      )}
                      <span>•</span>
                      <span>{new Date(txn.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className={`font-bold text-sm text-right ${
                      txn.type === "INCOME"
                        ? "text-teal-600 dark:text-teal-400"
                        : txn.type === "TRANSFER"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-foreground"
                    }`}
                  >
                    {txn.type === "INCOME" ? "+" : txn.type === "EXPENSE" ? "-" : ""}
                    {txn.currency} {Number(txn.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      if (confirm("Delete this transaction? This will adjust your account balance.")) {
                        deleteTxnMutation.mutate(txn.id);
                      }
                    }}
                    title="Delete transaction"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Quick Add Modal */}
      <QuickTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => refetch()}
        accounts={accounts}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onSuccess={() => refetch()}
        accounts={accounts}
      />
    </div>
  );
}
