"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Activity, Clock, Filter, Key, User } from "lucide-react";

export default function SessionsPage() {
    const [page, setPage] = useState(1);
    const { data, isLoading, error } = trpc.traces.getSessions.useQuery({ page, limit: 25 });

    if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading sessions...</div>;
    if (error) return <div className="p-8 text-center text-destructive">Error: {error.message}</div>;

    const sessions = data?.data || [];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Session Explorer</h2>
                    <p className="text-muted-foreground">Browse and analyze LangFuse AI invocation sessions.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80">
                        <Filter size={16} /> Filter
                    </button>
                </div>
            </div>

            <div className="border border-border rounded-lg bg-card overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground">
                        <tr>
                            <th className="px-4 py-3 font-medium">Session ID</th>
                            <th className="px-4 py-3 font-medium">Created At</th>
                            <th className="px-4 py-3 font-medium">User ID</th>
                            <th className="px-4 py-3 font-medium text-right">Cost (USD)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {sessions.map((session: any) => (
                            <tr key={session.id} className="hover:bg-muted/50 transition-colors">
                                <td className="px-4 py-3 font-mono text-xs text-primary cursor-pointer hover:underline">
                                    {session.id}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} />
                                        {new Date(session.createdAt).toLocaleString()}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <User size={14} className="text-muted-foreground" />
                                        {session.userId || "-"}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums">
                                    ${(session.cost || 0).toFixed(4)}
                                </td>
                            </tr>
                        ))}
                        {sessions.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                    No sessions found. Ensure LangFuse is actively receiving traces.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Showing {sessions.length} sessions</span>
                <div className="flex gap-2">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                        className="px-3 py-1 bg-secondary text-secondary-foreground rounded disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => setPage(page + 1)}
                        disabled={sessions.length < 25}
                        className="px-3 py-1 bg-secondary text-secondary-foreground rounded disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
