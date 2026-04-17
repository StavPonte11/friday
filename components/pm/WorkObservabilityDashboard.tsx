"use client";

import React from "react";
import { trpc } from "@/lib/trpc/client";
import { LoadingState } from "@/components/ui/loading-state";
import { AlertTriangle, Info, Zap, TrendingUp, Users, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { Insight } from "@/lib/ai/insights-engine";

const SEVERITY_CONFIG = {
    info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    critical: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" }
};

const VELOCITY_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe"];

export function WorkObservabilityDashboard({ projectId }: { projectId: string }) {
    const { data: metrics, isLoading: isLoadingMetrics } = trpc.pmInsights.getMetrics.useQuery({ projectId });
    const { data: insightsData, isLoading: isLoadingInsights } = trpc.pmInsights.getInsights.useQuery({ projectId });

    if (isLoadingMetrics || isLoadingInsights) {
        return <LoadingState title="Generating AI Insights..." description="Analysing your project's health metrics." />;
    }

    const insights = insightsData?.insights ?? [];
    const velocityData = metrics?.velocity ?? [];
    const teamData = metrics?.teamLoad ?? [];

    return (
        <div className="space-y-6 p-6">
            <div>
                <h2 className="text-xl font-bold text-foreground tracking-tight">Work Observability</h2>
                <p className="text-sm text-muted-foreground mt-1">AI-powered analysis of your team's execution patterns.</p>
            </div>

            {/* Metrics Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                    icon={<Clock size={18} />}
                    label="Avg Cycle Time"
                    value={metrics?.cycleTime != null ? `${metrics.cycleTime.toFixed(1)}d` : "—"}
                    description="Time to complete issues"
                />
                <MetricCard
                    icon={<TrendingUp size={18} />}
                    label="Latest Velocity"
                    value={velocityData.length > 0
                        ? `${velocityData[velocityData.length - 1].completedPoints}pts`
                        : "—"}
                    description="Points in last sprint"
                />
                <MetricCard
                    icon={<AlertTriangle size={18} />}
                    label="Bottlenecks"
                    value={String(metrics?.bottlenecks.length ?? 0)}
                    description="Blocking issues"
                    danger={(metrics?.bottlenecks.length ?? 0) > 2}
                />
                <MetricCard
                    icon={<Users size={18} />}
                    label="Active Members"
                    value={String(teamData.length)}
                    description="With open work"
                />
            </div>

            {/* AI Insights */}
            {insights.length > 0 && (
                <section>
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                        <Zap size={14} className="text-primary" />
                        AI Insights
                    </h3>
                    <div className="space-y-3">
                        {insights.map((insight: Insight, i: number) => {
                            const config = SEVERITY_CONFIG[insight.severity];
                            const Icon = config.icon;
                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        "flex gap-3 p-4 rounded-xl border",
                                        config.bg,
                                        config.border
                                    )}
                                >
                                    <Icon size={16} className={cn("flex-shrink-0 mt-0.5", config.color)} />
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{insight.message}</p>
                                        {insight.recommendation && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                💡 {insight.recommendation}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Sprint Velocity Chart */}
            {velocityData.length > 0 && (
                <section>
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                        <TrendingUp size={14} className="text-primary" />
                        Sprint Velocity
                    </h3>
                    <div className="h-48 w-full bg-muted/30 rounded-xl p-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={velocityData} barSize={32}>
                                <XAxis
                                    dataKey="sprintName"
                                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={32}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: "hsl(var(--popover))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "8px",
                                        fontSize: "12px"
                                    }}
                                />
                                <Bar dataKey="completedPoints" radius={[4, 4, 0, 0]}>
                                    {velocityData.map((_: unknown, index: number) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={VELOCITY_COLORS[index % VELOCITY_COLORS.length]}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            )}

            {/* Team Load */}
            {teamData.length > 0 && (
                <section>
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                        <Users size={14} className="text-primary" />
                        Team Load
                    </h3>
                    <div className="space-y-2">
                        {teamData.slice(0, 6).map((member: { user: { name?: string | null; image?: string | null } | null; count: number; points: number }) => (
                            <div key={member.user?.name ?? "unassigned"} className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                                    {member.user?.name?.charAt(0) ?? "?"}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-foreground">{member.user?.name ?? "Unassigned"}</span>
                                        <span className="text-xs text-muted-foreground">{member.count} issues · {member.points}pts</span>
                                    </div>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full transition-all"
                                            style={{ width: `${Math.min((member.points / Math.max(...teamData.map((m: { points: number }) => m.points))) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function MetricCard({
    icon, label, value, description, danger = false
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    description: string;
    danger?: boolean;
}) {
    return (
        <div className={cn(
            "p-4 rounded-xl border bg-card",
            danger ? "border-red-500/30 bg-red-500/5" : "border-border"
        )}>
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", danger ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary")}>
                {icon}
            </div>
            <p className={cn("text-2xl font-bold tracking-tight", danger ? "text-red-500" : "text-foreground")}>{value}</p>
            <p className="text-xs font-medium text-foreground mt-0.5">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
    );
}
