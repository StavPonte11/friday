"use client";

import { useEffect, useState } from "react";

interface HealthData {
    status: string;
    timestamp: string;
    uptime: { seconds: number; human: string };
    database: { connected: boolean; latencyMs: number };
    memory: { heapUsedMb: number; heapTotalMb: number; rssMb: number };
    environment: string;
}

function StatusBadge({ ok }: { ok: boolean }) {
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${ok ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            {ok ? "Healthy" : "Degraded"}
        </span>
    );
}

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
        <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
            {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
        </div>
    );
}

export default function SystemHealthPage() {
    const [data, setData] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const fetchHealth = async () => {
        try {
            const res = await fetch("/api/health");
            const json = await res.json();
            setData(json);
            setLastRefresh(new Date());
            setError(null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 30_000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="text-muted-foreground text-sm animate-pulse">Checking system health...</div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">System Health</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Last updated: {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 30s
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {data && <StatusBadge ok={data.status === "healthy"} />}
                    <button
                        onClick={fetchHealth}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded px-2 py-1"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30 p-4 text-sm text-red-700 dark:text-red-400">
                    ⚠ Could not reach health endpoint: {error}
                </div>
            )}

            {data && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard
                            label="Database Latency"
                            value={data.database.latencyMs >= 0 ? `${data.database.latencyMs}ms` : "—"}
                            sub={data.database.connected ? "Connected" : "Disconnected"}
                        />
                        <MetricCard
                            label="Uptime"
                            value={data.uptime.human}
                            sub={`${data.uptime.seconds.toLocaleString()}s`}
                        />
                        <MetricCard
                            label="Heap Used"
                            value={`${data.memory.heapUsedMb} MB`}
                            sub={`of ${data.memory.heapTotalMb} MB total`}
                        />
                        <MetricCard
                            label="RSS Memory"
                            value={`${data.memory.rssMb} MB`}
                            sub="Process memory"
                        />
                    </div>

                    <div className="rounded-lg border border-border bg-card p-4">
                        <h2 className="text-sm font-medium text-foreground mb-3">Environment Details</h2>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Environment</span>
                                <span className="font-mono font-medium text-foreground capitalize">{data.environment}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">DB Status</span>
                                <StatusBadge ok={data.database.connected} />
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Timestamp</span>
                                <span className="font-mono text-xs text-muted-foreground">{new Date(data.timestamp).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Overall Status</span>
                                <StatusBadge ok={data.status === "healthy"} />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
