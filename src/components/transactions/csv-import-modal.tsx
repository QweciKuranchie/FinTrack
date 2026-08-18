"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";

interface AccountOption {
  id: string;
  name: string;
  currency: string;
}

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: AccountOption[];
}

interface ParsedRow {
  date: string;
  amount: number;
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  description: string;
}

export function CsvImportModal({
  isOpen,
  onClose,
  onSuccess,
  accounts,
}: CsvImportModalProps) {
  const [step, setStep] = useState<"SELECT" | "PREVIEW" | "RESULT">("SELECT");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ insertedCount: number; skippedCount: number } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseCsvFile(selectedFile);
    }
  };

  const parseCsvFile = (csvFile: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
        if (lines.length <= 1) {
          setError("CSV file is empty or missing headers");
          return;
        }

        const rows: ParsedRow[] = [];
        // Header line skipped, auto-detect columns
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.replace(/^["']|["']$/g, "").trim());
          if (cols.length < 2) continue;

          // Attempt date parsing from first 2 columns
          let dateStr = new Date().toISOString().split("T")[0];
          if (!isNaN(Date.parse(cols[0]))) {
            dateStr = new Date(cols[0]).toISOString().split("T")[0];
          }

          // Amount detection
          let rawAmount = 0;
          let txnType: "EXPENSE" | "INCOME" = "EXPENSE";

          const val1 = parseFloat(cols[1]);
          const val2 = cols.length > 2 ? parseFloat(cols[2]) : NaN;

          if (!isNaN(val1)) {
            rawAmount = Math.abs(val1);
            if (val1 > 0) txnType = "INCOME";
          } else if (!isNaN(val2)) {
            rawAmount = Math.abs(val2);
            if (val2 > 0) txnType = "INCOME";
          }

          const desc = cols.slice(2).join(" ") || cols[1] || "CSV Import";

          if (rawAmount > 0) {
            rows.push({
              date: dateStr,
              amount: rawAmount,
              type: txnType,
              description: desc,
            });
          }
        }

        if (rows.length === 0) {
          setError("No valid transaction rows found in CSV");
          return;
        }

        setParsedRows(rows);
        setError(null);
        setStep("PREVIEW");
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(`Failed to parse CSV: ${err.message}`);
        }
      }
    };
    reader.readAsText(csvFile);
  };

  const handleConfirmImport = async () => {
    if (!accountId) {
      setError("Please select a target account");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          filename: file?.name || "statement.csv",
          rows: parsedRows,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "CSV Import failed");
      }

      setResult(json.data);
      setStep("RESULT");
      onSuccess();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl border">
        <h2 className="text-xl font-bold tracking-tight mb-1">Import Statement CSV</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Bulk import transactions from bank or MoMo CSV exports with automatic deduplication
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-destructive/15 p-3 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === "SELECT" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="import-account">Select Target Account</Label>
              <select
                id="import-account"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
              </select>
            </div>

            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-brand-teal/50 transition-colors">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <Label htmlFor="csv-file-input" className="cursor-pointer font-semibold text-brand-teal">
                Choose CSV Statement File
              </Label>
              <p className="text-xs text-muted-foreground mt-1">Supports Bank & MoMo statement exports</p>
              <Input
                id="csv-file-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {step === "PREVIEW" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Previewing {parsedRows.length} rows</span>
              <span>Account: {accounts.find((a) => a.id === accountId)?.name}</span>
            </div>

            <div className="max-h-60 overflow-y-auto border rounded-lg divide-y text-xs">
              {parsedRows.slice(0, 10).map((row, idx) => (
                <div key={idx} className="p-2 flex items-center justify-between">
                  <div>
                    <span className="font-semibold block">{row.description}</span>
                    <span className="text-muted-foreground">{row.date}</span>
                  </div>
                  <span
                    className={
                      row.type === "INCOME" ? "font-bold text-teal-600" : "font-bold text-foreground"
                    }
                  >
                    {row.type === "INCOME" ? "+" : "-"}
                    {row.amount.toFixed(2)}
                  </span>
                </div>
              ))}
              {parsedRows.length > 10 && (
                <div className="p-2 text-center text-muted-foreground italic">
                  + {parsedRows.length - 10} more rows
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setStep("SELECT")}>
                Back
              </Button>
              <Button
                type="button"
                className="bg-brand-teal text-white hover:bg-brand-teal/90"
                onClick={handleConfirmImport}
                disabled={loading}
              >
                {loading ? "Importing..." : `Confirm Import (${parsedRows.length} rows)`}
              </Button>
            </div>
          </div>
        )}

        {step === "RESULT" && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-teal-600 mb-2" />
            <h3 className="text-lg font-bold">Import Completed!</h3>
            <p className="text-sm text-muted-foreground">
              Successfully imported <strong className="text-foreground">{result?.insertedCount}</strong> new transactions.
              {result?.skippedCount ? ` (${result.skippedCount} duplicate rows skipped)` : ""}
            </p>
            <div className="pt-4">
              <Button
                className="bg-brand-teal text-white"
                onClick={() => {
                  onClose();
                  setStep("SELECT");
                }}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
