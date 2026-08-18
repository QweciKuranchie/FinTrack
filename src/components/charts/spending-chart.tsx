"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

interface CategoryData {
  name: string;
  amount: number;
  color: string;
}

interface MonthlyData {
  month: string;
  amount: number;
}

export function SpendingCategoryChart({ categoryData }: { categoryData: CategoryData[] }) {
  if (!categoryData || categoryData.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
        No category spend data available for chart.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value: unknown) => [`GHS ${Number(value ?? 0).toFixed(2)}`, "Spend"]}
            contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
          />
          <Bar dataKey="amount" fill="#0F766E" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SpendingTrendChart({ monthlyData }: { monthlyData: MonthlyData[] }) {
  if (!monthlyData || monthlyData.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
        No monthly trend data recorded yet.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value: unknown) => [`GHS ${Number(value ?? 0).toFixed(2)}`, "Monthly Spend"]}
            contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
          />
          <Line type="monotone" dataKey="amount" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
