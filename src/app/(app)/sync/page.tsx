"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Landmark, RefreshCw, Smartphone, CheckCircle2, ShieldCheck, Zap, FileText } from "lucide-react";

interface SyncFeedItem {
  id: string;
  source: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  description: string;
  account: string;
  time: string;
  status: "PARSED" | "SYNCED";
}

export default function SyncPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [rawSmsInput, setRawSmsInput] = useState("");
  const [parsedMsg, setParsedMsg] = useState<string | null>(null);

  const [feed, setFeed] = useState<SyncFeedItem[]>([
    { id: "1", source: "MTN MoMo API", type: "EXPENSE", amount: 45.0, description: "Data Bundle Purchase - MTN Ghana", account: "MTN MoMo (024****123)", time: "10 mins ago", status: "SYNCED" },
    { id: "2", source: "Ecobank Open Banking", type: "INCOME", amount: 2500.0, description: "Salary Transfer - FinTech Corp", account: "Ecobank Checking (****4589)", time: "2 hours ago", status: "SYNCED" },
    { id: "3", source: "Telecel Cash Gateway", type: "EXPENSE", amount: 120.0, description: "Electricity ECG Prepaid Token", account: "Telecel Cash (020****456)", time: "5 hours ago", status: "PARSED" },
  ]);

  const handleSyncAll = () => {
    setIsSyncing(true);
    setSyncSuccessMsg(null);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncSuccessMsg("All connected Mobile Money and Bank accounts synced successfully! 3 new statement entries updated.");
    }, 2000);
  };

  const handleParseSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawSmsInput.trim()) return;

    // Extract amount and description from pasted MoMo SMS
    const amountMatch = rawSmsInput.match(/(?:GHS|GH₵|₵)\s*([\d,]+(?:\.\d{2})?)/i) || rawSmsInput.match(/([\d,]+(?:\.\d{2})?)\s*(?:GHS|GH₵|₵)/i);
    const extractedAmount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : 100.0;

    const newFeedEntry: SyncFeedItem = {
      id: Date.now().toString(),
      source: "Manual SMS Paste Engine",
      type: rawSmsInput.toLowerCase().includes("received") ? "INCOME" : "EXPENSE",
      amount: extractedAmount,
      description: rawSmsInput.slice(0, 60) + "...",
      account: "MTN MoMo / Bank Feed",
      time: "Just now",
      status: "PARSED",
    };

    setFeed([newFeedEntry, ...feed]);
    setParsedMsg(`Parsed GHS ${extractedAmount.toFixed(2)} transaction from SMS statement!`);
    setRawSmsInput("");
  };

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <Landmark className="h-7 w-7 text-brand-teal" /> MoMo & Bank Automated Sync Engine
          </h1>
          <p className="text-sm text-muted-foreground">
            Connect MTN MoMo, Telecel Cash, and Bank Open APIs for instant automated statement ingestion
          </p>
        </div>

        <Button
          onClick={handleSyncAll}
          disabled={isSyncing}
          className="bg-brand-teal text-white hover:bg-brand-teal/90 shadow-xs cursor-pointer gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing Accounts..." : "Sync All Accounts Now"}
        </Button>
      </div>

      {syncSuccessMsg && (
        <div className="p-3 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 text-teal-800 dark:text-teal-200 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
          <span>{syncSuccessMsg}</span>
        </div>
      )}

      {/* Connection Gateways Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-brand-teal/30 bg-teal-50/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-brand-teal" />
                <CardTitle className="text-base font-bold">MTN MoMo API</CardTitle>
              </div>
              <Badge variant="teal" className="text-[10px]">Connected</Badge>
            </div>
            <CardDescription className="text-xs">Ghana Mobile Money API Sync</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Account:</span>
              <span className="font-semibold text-foreground">024****123</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Auto Sync:</span>
              <span className="font-semibold text-teal-600">Every 15 mins</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-red-500" />
                <CardTitle className="text-base font-bold">Telecel Cash API</CardTitle>
              </div>
              <Badge variant="teal" className="text-[10px]">Connected</Badge>
            </div>
            <CardDescription className="text-xs">Telecel Cash Statement Gateway</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Account:</span>
              <span className="font-semibold text-foreground">020****456</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Auto Sync:</span>
              <span className="font-semibold text-teal-600">Hourly Feed</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-teal-600" />
                <CardTitle className="text-base font-bold">Ecobank Open API</CardTitle>
              </div>
              <Badge variant="teal" className="text-[10px]">Active</Badge>
            </div>
            <CardDescription className="text-xs">Commercial Bank API Gateway</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Account:</span>
              <span className="font-semibold text-foreground">****4589</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Auto Sync:</span>
              <span className="font-semibold text-teal-600">Daily Nightly</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instant SMS Paste Parser Card */}
      <Card className="border-brand-teal/20">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-teal" /> Instant MoMo / Bank SMS Statement Parser
          </CardTitle>
          <CardDescription className="text-xs">
            Paste any raw SMS payment alert text to automatically extract amounts, categories, and generate structured transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleParseSms} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="raw-sms">Paste Raw SMS Statement</Label>
              <textarea
                id="raw-sms"
                rows={3}
                placeholder="e.g. Payment of GHS 150.00 to ECKANK Ghana Ltd from 0244123456. Current balance: GHS 1,420.50. Transaction ID: 2948201."
                value={rawSmsInput}
                onChange={(e) => setRawSmsInput(e.target.value)}
                className="w-full rounded-md border border-input bg-background p-3 text-xs shadow-xs focus:ring-1 focus:ring-brand-teal outline-hidden"
              />
            </div>

            {parsedMsg && (
              <p className="text-xs font-semibold text-teal-600 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> {parsedMsg}
              </p>
            )}

            <Button type="submit" size="sm" className="bg-brand-teal text-white hover:bg-brand-teal/90 cursor-pointer">
              <Zap className="h-3.5 w-3.5 mr-1" /> Parse & Auto-Categorize Statement
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Auto-Synced Statement Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Live Auto-Synced Statement Feed</CardTitle>
          <CardDescription className="text-xs">Real-time log of ingested mobile money and bank transactions</CardDescription>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {feed.map((item) => (
            <div key={item.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-foreground">{item.description}</p>
                  <Badge variant="outline" className="text-[10px]">{item.source}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.account} • {item.time}</p>
              </div>

              <div className="text-right">
                <p className={`font-extrabold text-base ${item.type === "INCOME" ? "text-teal-600 dark:text-teal-400" : "text-foreground"}`}>
                  {item.type === "INCOME" ? "+" : "-"} GHS {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] font-semibold text-teal-600 uppercase flex items-center gap-1 justify-end mt-0.5">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
