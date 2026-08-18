"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface SnapshotData {
  date: string;
  netWorth: number;
}

export function NetWorthTrendChart({ data }: { data: SnapshotData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
        Net worth snapshot trend will appear here as daily snapshots run.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value: unknown) => [`GHS ${Number(value ?? 0).toFixed(2)}`, "Net Worth"]}
            contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
          />
          <Line type="monotone" dataKey="netWorth" stroke="#0F766E" strokeWidth={3} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
