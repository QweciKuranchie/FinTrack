"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  PieChart,
  TrendingUp,
  CalendarCheck,
  Settings,
  Plus,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Accounts", href: "/accounts", icon: Wallet },
  { name: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { name: "Budgets", href: "/budgets", icon: PieChart },
  { name: "Net Worth", href: "/net-worth", icon: TrendingUp },
  { name: "Subscriptions", href: "/subscriptions", icon: CalendarCheck },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-card/60 backdrop-blur-sm z-30">
        <div className="flex h-16 items-center px-6 border-b gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-brand-teal dark:bg-teal-950 dark:text-teal-400">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">FinTrack</span>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-teal text-white shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut className="h-4 w-4 mr-3" />
            {loggingOut ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:pl-64 pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto p-4 md:p-8">{children}</div>
      </main>

      {/* Mobile Floating Add Button */}
      <Link
        href="/transactions?action=new"
        className="fixed right-5 bottom-20 md:bottom-8 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-teal text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Quick add transaction"
      >
        <Plus className="h-6 w-6" />
      </Link>

      {/* Mobile Bottom Tab Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t bg-card/90 backdrop-blur-md flex items-center justify-around z-30 px-2">
        {navItems.slice(0, 5).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full py-1 text-xs font-medium transition-colors",
                isActive ? "text-brand-teal" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5 mb-0.5" />
              <span className="truncate max-w-[64px]">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
