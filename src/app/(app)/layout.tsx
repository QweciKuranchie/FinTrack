"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Compass,
  TrendingUp,
  CreditCard,
  Wallet,
  Coins,
  Bot,
  HandCoins,
  RefreshCw,
  LineChart,
  Scale,
  Trophy,
  Users,
  Handshake,
  Landmark,
  FileSpreadsheet,
  Brain,
  HelpCircle,
  Settings,
  LogOut,
  User,
  ChevronDown,
  X,
  Menu,
  Plus,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { QuickTransactionModal } from "@/components/transactions/quick-transaction-modal";
import { CsvImportModal } from "@/components/transactions/csv-import-modal";

interface NavItem {
  name: string;
  href?: string;
  action?: "ADD_EXPENSE" | "CSV_IMPORT";
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const sidebarSections: NavSection[] = [
  {
    title: "MAIN MENU",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: Compass },
      { name: "Statistics", href: "/dashboard?tab=analytics", icon: TrendingUp },
      { name: "Add Expense", action: "ADD_EXPENSE", icon: CreditCard },
      { name: "Budget", href: "/budgets", icon: Wallet },
    ],
  },
  {
    title: "FINANCIAL CATEGORY",
    items: [
      { name: "Category Budgets", href: "/budgets", icon: Coins },
      { name: "Budget Goals", href: "/net-worth", icon: Bot },
      { name: "Debt Manager", href: "/net-worth", icon: HandCoins },
      { name: "Subscriptions", href: "/subscriptions", icon: RefreshCw },
    ],
  },
  {
    title: "WEALTH",
    items: [
      { name: "Investments", href: "/net-worth", icon: LineChart },
      { name: "Net Worth", href: "/net-worth", icon: Scale },
      { name: "Achievements", href: "/settings", icon: Trophy },
    ],
  },
  {
    title: "COLLABORATIVE",
    items: [
      { name: "Shared Workspaces", href: "/settings", icon: Users },
      { name: "Bill Splits", href: "/transactions", icon: Handshake },
    ],
  },
  {
    title: "INTEGRATIONS",
    items: [
      { name: "Bank Sync", href: "/accounts", icon: Landmark },
      { name: "CSV Import", action: "CSV_IMPORT", icon: FileSpreadsheet },
    ],
  },
  {
    title: "INSIGHTS",
    items: [
      { name: "AI Insights", href: "/dashboard", icon: Brain },
    ],
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);

  // Accounts for transaction modal
  const { data: accountsData } = useQuery<{ data: Array<{ id: string; name: string; currency: string }> }>({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      return res.json();
    },
  });

  const accounts = accountsData?.data ?? [];

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleItemClick = (item: NavItem) => {
    if (item.action === "ADD_EXPENSE") {
      setIsQuickAddOpen(true);
    } else if (item.action === "CSV_IMPORT") {
      setIsCsvImportOpen(true);
    }
    setIsMobileMenuOpen(false);
  };

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col bg-[#009688] dark:bg-[#064E3B] text-white">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-6 pt-2">
        <span className="font-bold text-2xl tracking-tight text-white">FinTrack</span>
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden text-white/80 hover:text-white p-1"
          aria-label="Close menu"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Household / Workspace Selector Pill */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-between rounded-xl bg-white/10 border border-white/20 px-3.5 py-2.5 text-sm text-white font-medium shadow-sm transition-colors hover:bg-white/15 cursor-pointer">
          <div className="flex items-center gap-2.5">
            <User className="h-4 w-4 text-teal-100" />
            <span className="truncate max-w-[140px]">Personal Finance</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-80 shrink-0" />
        </div>
      </div>

      {/* Nav Sections Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 scrollbar-thin scrollbar-thumb-white/20">
        {sidebarSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-teal-100/70 pt-2 pb-1">
              {section.title}
            </h3>
            {section.items.map((item) => {
              const isActive = item.href ? pathname === item.href : false;
              const Icon = item.icon;

              if (item.action) {
                return (
                  <button
                    key={item.name}
                    onClick={() => handleItemClick(item)}
                    className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-teal-50 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <Icon className="h-4 w-4 text-teal-100" />
                    <span>{item.name}</span>
                  </button>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href || "#"}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[#182328] text-white shadow-md font-semibold"
                      : "text-teal-50 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 text-teal-100" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        ))}

        {/* Footer Nav Links */}
        <div className="pt-4 border-t border-white/10 space-y-1">
          <Link
            href="/settings"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-teal-50 hover:bg-white/10 hover:text-white transition-colors"
          >
            <HelpCircle className="h-4 w-4 text-teal-100" />
            <span>Help Center</span>
          </Link>
          <Link
            href="/settings"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-teal-50 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Settings className="h-4 w-4 text-teal-100" />
            <span>Settings</span>
          </Link>
        </div>
      </div>

      {/* Logout Action Button */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-[#FF5252] hover:bg-[#FF3838] text-white font-semibold py-3 px-4 shadow-md transition-all active:scale-98"
        >
          <LogOut className="h-4 w-4" />
          <span>{loggingOut ? "Logging out..." : "Logout"}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 shadow-xl">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Header Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#009688] text-white flex items-center justify-between px-4 z-40 shadow-md">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <span className="font-bold text-xl tracking-tight">FinTrack</span>
        <button
          onClick={() => setIsQuickAddOpen(true)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white"
          aria-label="Add expense"
        >
          <Plus className="h-6 w-6" />
        </button>
      </header>

      {/* Mobile Sidebar Overlay Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] flex-1 z-10 shadow-2xl">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 md:pl-64 pt-14 md:pt-0 pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto p-4 md:p-8">{children}</div>
      </main>

      {/* Mobile Floating Add Button */}
      <button
        onClick={() => setIsQuickAddOpen(true)}
        className="fixed right-5 bottom-20 md:bottom-8 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#009688] text-white shadow-xl transition-transform hover:scale-105 active:scale-95"
        aria-label="Quick add transaction"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Mobile Bottom Tab Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t bg-card/95 backdrop-blur-md flex items-center justify-around z-30 px-2">
        {[
          { name: "Dashboard", href: "/dashboard", icon: Compass },
          { name: "Accounts", href: "/accounts", icon: Landmark },
          { name: "Transactions", href: "/transactions", icon: ArrowLeftRight },
          { name: "Budgets", href: "/budgets", icon: Wallet },
          { name: "Net Worth", href: "/net-worth", icon: Scale },
        ].map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full py-1 text-xs font-medium transition-colors",
                isActive ? "text-[#009688] font-bold" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5 mb-0.5" />
              <span className="truncate max-w-[64px]">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Quick Transaction Modal */}
      <QuickTransactionModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={() => router.refresh()}
        accounts={accounts}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        onSuccess={() => router.refresh()}
        accounts={accounts}
      />
    </div>
  );
}
