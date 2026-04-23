"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useSession } from "next-auth/react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, Legend
} from "recharts";
import {
    Loader2, TrendingUp, AlertTriangle, Target, Users, Layers2,
    Sparkles, Share2, CheckCircle, Clock, Copy, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SprintPlanningPanel } from "@/components/pm/sprint/SprintPlanningPanel";

// ─── Color palette ────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
    DONE: "#22c55e",
    IN_PROGRESS: "#3b82f6",
    IN_REVIEW: "#a855f7",
    BLOCKED: "#ef4444",
    TODO: "#94a3b8",
    BACKLOG: "#64748b",
};

const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#94a3b8"];

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, trend, color }: {
    label: string; value: number | string; icon: React.ElementType;
    trend?: string; color: string;
}) {
    return (
        <div className={cn("rounded-2xl border border-border bg-card p-5 flex items-start gap-4 relative overflow-hidden group")}>
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
                <Icon size={18} className="text-white" />
            </div>
            <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
                {trend && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{trend}</p>}
            </div>
        </div>
    );
}

// ─── Sprint health row ────────────────────────────────────────────────────────
function SprintHealthRow({ name, sprintName, done, total, pct }: {
    name: string; sprintName: string | null; done?: number; total?: number; pct: number | null;
}) {
    if (!sprintName) return null;
    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium truncate">{name}</span>
                    <span className="text-muted-foreground">{pct ?? 0}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                        className={cn("h-full rounded-full transition-all", (pct ?? 0) >= 80 ? "bg-green-500" : (pct ?? 0) >= 50 ? "bg-blue-500" : "bg-amber-500")}
                        style={{ width: `${pct ?? 0}%` }}
                    />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{sprintName} · {done}/{total} done</p>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ExecutiveDashboard() {
    const { data: session } = useSession();
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);

    // Get first workspace — in production, pick from session
    const { data: projects, isLoading: projectsLoading } = trpc.pmProjects.list.useQuery(undefined, { staleTime: 30_000 });
    const workspaceId = projects?.[0]?.workspaceId;
    const projectId = projects?.[0]?.id;

    const { data: metrics, isLoading: metricsLoading } = trpc.pmExecutive.metrics.useQuery(
        { workspaceId: workspaceId! },
        { enabled: !!workspaceId, staleTime: 60_000 }
    );

    const aiSummaryMutation = trpc.pmExecutive.aiSummary.useMutation({
        onSuccess: (data) => {
            setAiSummary(data.summary);
            setSummaryLoading(false);
        },
        onError: () => setSummaryLoading(false),
    });

    const shareTokenMutation = trpc.pmExecutive.createShareToken.useMutation({
        onSuccess: (data) => {
            const url = `${window.location.origin}${data.shareUrl}`;
            setShareUrl(url);
        }
    });

    function handleGenerateSummary() {
        if (!workspaceId) return;
        setSummaryLoading(true);
        aiSummaryMutation.mutate({ workspaceId });
    }

    function handleCreateShareLink() {
        if (!workspaceId) return;
        shareTokenMutation.mutate({
            workspaceId,
            projectId: projectId || undefined,
            createdById: (session?.user as any)?.id,
        });
    }

    async function handleCopy() {
        if (!shareUrl) return;
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const loading = projectsLoading || metricsLoading;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full py-20">
                <Loader2 className="animate-spin text-muted-foreground" size={32} />
            </div>
        );
    }

    if (!metrics) {
        return <div className="p-8 text-muted-foreground text-sm">No workspace found. Create a project first.</div>;
    }

    // Chart data
    const statusData = metrics.issuesByStatus.map((s: any) => ({
        name: s.status,
        count: s._count._all,
        fill: STATUS_COLORS[s.status] ?? "#94a3b8",
    }));

    const priorityData = metrics.issuesByPriority.map((p: any, i: number) => ({
        name: p.priority,
        value: p._count._all,
        fill: PIE_COLORS[i % PIE_COLORS.length],
    }));

    const totalIssues = statusData.reduce((s: number, d: any) => s + d.count, 0);
    const doneCount = statusData.find((d: any) => d.name === "DONE")?.count ?? 0;
    const healthPct = totalIssues > 0 ? Math.round((doneCount / totalIssues) * 100) : 0;

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Executive Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Real-time delivery health across {metrics.projects.length} project{metrics.projects.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {shareUrl ? (
                        <div className="flex items-center gap-2">
                            <input
                                readOnly
                                value={shareUrl}
                                className="text-xs px-3 py-1.5 rounded-lg bg-muted border border-border w-64"
                            />
                            <button onClick={handleCopy} className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground">
                                {copied ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
                            </button>
                            <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground">
                                <ExternalLink size={14} />
                            </a>
                        </div>
                    ) : (
                        <button
                            onClick={handleCreateShareLink}
                            disabled={shareTokenMutation.isPending}
                            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 border border-border transition-colors"
                        >
                            {shareTokenMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Share2 size={12} />}
                            Share Dashboard
                        </button>
                    )}
                </div>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Issues" value={totalIssues} icon={Target} color="bg-indigo-500" trend={`${doneCount} done`} />
                <StatCard label="Overdue" value={metrics.overdue} icon={AlertTriangle} color={metrics.overdue > 0 ? "bg-red-500" : "bg-green-500"} trend={metrics.overdue > 0 ? "Needs attention" : "All on track"} />
                <StatCard label="Blocked" value={metrics.blockers} icon={Clock} color={metrics.blockers > 0 ? "bg-amber-500" : "bg-green-500"} trend={metrics.blockers > 0 ? "Remove blockers" : "No blockers"} />
                <StatCard label="Delivery Health" value={`${healthPct}%`} icon={TrendingUp} color="bg-violet-500" trend={`${metrics.projects.length} projects`} />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Issue status bar */}
                <div className="rounded-2xl border border-border bg-card p-5">
                    <h3 className="text-sm font-semibold mb-4">Issues by Status</h3>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={statusData} barCategoryGap="40%">
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip cursor={false} />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                {statusData.map((entry: any, i: number) => (
                                    <Cell key={i} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Priority pie */}
                <div className="rounded-2xl border border-border bg-card p-5">
                    <h3 className="text-sm font-semibold mb-4">Issues by Priority</h3>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={3}>
                                {priorityData.map((entry: any, i: number) => (
                                    <Cell key={i} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Sprint health */}
                <div className="md:col-span-2 rounded-2xl border border-border bg-card p-5 space-y-4">
                    <h3 className="text-sm font-semibold">Sprint Health per Project</h3>
                    <div className="space-y-3">
                        {metrics.sprintHealth.length > 0
                            ? metrics.sprintHealth.map((s: any) => (
                                <SprintHealthRow key={s.projectId} {...s} />
                            ))
                            : <p className="text-xs text-muted-foreground">No active sprints. Start a sprint to see health data.</p>
                        }
                    </div>
                </div>

                {/* AI summary + Sprint planning */}
                <div className="space-y-4">
                    <div className="rounded-2xl border border-border bg-card p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={14} className="text-violet-500" />
                            <h3 className="text-sm font-semibold">AI Executive Summary</h3>
                        </div>
                        {aiSummary ? (
                            <p className="text-xs text-muted-foreground leading-relaxed">{aiSummary}</p>
                        ) : (
                            <>
                                <p className="text-xs text-muted-foreground mb-3">
                                    Generate a briefing for leadership about delivery health, risks, and recommended actions.
                                </p>
                                <button
                                    onClick={handleGenerateSummary}
                                    disabled={summaryLoading || !workspaceId}
                                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 transition-colors"
                                >
                                    {summaryLoading ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                                    Generate Summary
                                </button>
                            </>
                        )}
                    </div>

                    {/* Sprint planning */}
                    {projectId && <SprintPlanningPanel projectId={projectId} />}
                </div>
            </div>

            {/* Recent activity */}
            <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-2">
                    {metrics.recentActivity.length > 0 ? (
                        metrics.recentActivity.slice(0, 8).map((a: any) => (
                            <div key={a.id} className="flex items-center gap-3 text-xs text-muted-foreground">
                                <div className="w-6 h-6 rounded-full bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden">
                                    {a.actor?.image
                                        ? <img src={a.actor.image} alt={a.actor.name ?? ""} className="w-full h-full object-cover" />
                                        : <span className="text-[10px] font-bold">{a.actor?.name?.[0] ?? "?"}</span>
                                    }
                                </div>
                                <span>
                                    <span className="font-medium text-foreground">{a.actor?.name ?? "Unknown"}</span>
                                    {" "}changed{" "}
                                    <span className="font-medium text-foreground">{a.field}</span>
                                    {" on "}
                                    <span className="font-mono text-[10px] text-primary">{a.issue?.key}</span>
                                    {" — "}{a.issue?.title?.slice(0, 40)}
                                </span>
                                <span className="ml-auto flex-shrink-0">{new Date(a.createdAt).toLocaleDateString()}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-muted-foreground">No recent activity yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
