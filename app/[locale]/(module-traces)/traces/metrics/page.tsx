"use client";

import React from "react";
import { trpc } from "@/lib/trpc/client";
import { LineChart, BarChart, Activity } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-state";

export default function MetricsPage() {
    const { data, isLoading } = trpc.traces.getMetrics.useQuery();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Model Metrics Dashboard</h2>
                <p className="text-muted-foreground">Observe token usage, latencies, and total costs across the portal.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="border border-border rounded-lg bg-card p-6 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <LineChart size={18} />
                        <span className="text-sm font-medium uppercase tracking-wider">Total Tokens (24h)</span>
                    </div>
                    <span className="text-3xl font-bold tabular-nums">
                        {isLoading ? <LoadingSpinner className="p-0 max-w-min" /> : "1.24M"}
                    </span>
                    <span className="text-xs text-green-500">+12% from yesterday</span>
                </div>

                <div className="border border-border rounded-lg bg-card p-6 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <BarChart size={18} />
                        <span className="text-sm font-medium uppercase tracking-wider">Total Cost (24h)</span>
                    </div>
                    <span className="text-3xl font-bold tabular-nums">
                        {isLoading ? <LoadingSpinner className="p-0 max-w-min" /> : "$14.20"}
                    </span>
                    <span className="text-xs text-green-500">+4% from yesterday</span>
                </div>

                <div className="border border-border rounded-lg bg-card p-6 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Activity size={18} />
                        <span className="text-sm font-medium uppercase tracking-wider">Average Latency</span>
                    </div>
                    <span className="text-3xl font-bold tabular-nums">
                        {isLoading ? <LoadingSpinner className="p-0 max-w-min" /> : "845ms"}
                    </span>
                    <span className="text-xs text-muted-foreground">p95: 1.2s</span>
                </div>
            </div>

            <div className="h-96 w-full border border-border rounded-lg bg-card flex flex-col items-center justify-center text-muted-foreground">
                {/* Recharts integration would render the timeseries here */}
                <LineChart size={48} className="mb-4 opacity-50" />
                <p>Timeseries metric chart placeholder (requires Recharts integration).</p>
            </div>
        </div>
    );
}
