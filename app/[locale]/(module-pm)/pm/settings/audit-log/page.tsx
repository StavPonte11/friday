"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";

interface AuditEntry {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    details: any;
    createdAt: string;
    userId: string | null;
}

const actionColors: Record<string, string> = {
    "issue.created": "text-green-600 dark:text-green-400",
    "issue.deleted": "text-red-600 dark:text-red-400",
    "issue.updated": "text-blue-600 dark:text-blue-400",
    "project.created": "text-purple-600 dark:text-purple-400",
    "project.deleted": "text-red-600 dark:text-red-400",
    "project.member.added": "text-indigo-600 dark:text-indigo-400",
    "project.member.removed": "text-orange-600 dark:text-orange-400",
    "frontend.error": "text-red-500 dark:text-red-400",
};

export default function AuditLogPage() {
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("");

    useEffect(() => {
        fetch("/api/audit")
            .then(r => r.json())
            .then(data => {
                setEntries(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const filtered = filter
        ? entries.filter(e =>
            e.action.toLowerCase().includes(filter.toLowerCase()) ||
            e.entityType.toLowerCase().includes(filter.toLowerCase())
        )
        : entries;

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
                    <p className="text-sm text-muted-foreground mt-1">Complete record of all actions across your organization</p>
                </div>
                <input
                    type="text"
                    placeholder="Filter by action or type..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-56"
                />
            </div>

            {loading ? (
                <div className="text-center py-12 text-muted-foreground text-sm">Loading audit log...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">No audit entries found</div>
            ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Action</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Entity</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Details</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">When</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filtered.map(entry => (
                                <tr key={entry.id} className="bg-card hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className={`font-mono text-xs font-medium ${actionColors[entry.action] ?? "text-foreground"}`}>
                                            {entry.action}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs text-muted-foreground">{entry.entityType}</span>
                                        {entry.entityId && (
                                            <span className="ml-1 text-xs font-mono text-foreground/50">#{entry.entityId.slice(0, 8)}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 max-w-xs">
                                        <span className="text-xs text-muted-foreground truncate block">
                                            {entry.details ? JSON.stringify(entry.details).slice(0, 60) : "—"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                        {new Date(entry.createdAt).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
