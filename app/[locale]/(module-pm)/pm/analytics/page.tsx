"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ScatterChart, Scatter, LineChart, Line
} from "recharts";
import { TrendingDown, Zap, GitBranch, Clock, Users } from "lucide-react";

const MOCK_PROJECT_ID = "cm7k12abc0001xyz";
const MOCK_SPRINT_ID = "sprint-001";

// --- Helpers ---
const CHART_COLORS = {
    primary: "#6366f1",
    secondary: "#8b5cf6",
    accent: "#06b6d4",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
};

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
    return (
        <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <Icon size={18} />
            </div>
            <div>
                <h3 className="font-semibold text-base">{title}</h3>
                <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
        </div>
    );
}

function ChartCard({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            {children}
        </div>
    );
}

// --- Main Page ---
export default function AnalyticsPage() {
    const { data: burndown } = trpc.pmAnalytics.burndown.useQuery({ sprintId: MOCK_SPRINT_ID });
    const { data: velocity } = trpc.pmAnalytics.velocity.useQuery({ projectId: MOCK_PROJECT_ID });
    const { data: cfd } = trpc.pmAnalytics.cumulativeFlow.useQuery({ projectId: MOCK_PROJECT_ID, days: 14 });
    const { data: cycleTimes } = trpc.pmAnalytics.cycleTime.useQuery({ projectId: MOCK_PROJECT_ID });
    const { data: workload } = trpc.pmAnalytics.workload.useQuery({ projectId: MOCK_PROJECT_ID });

    // Fallback "demo" data so charts look great even with empty DB
    const burndownData = burndown?.length ? burndown : [
        { date: "Feb 17", remaining: 42, ideal: 42 },
        { date: "Feb 18", remaining: 38, ideal: 36 },
        { date: "Feb 19", remaining: 35, ideal: 30 },
        { date: "Feb 20", remaining: 29, ideal: 24 },
        { date: "Feb 21", remaining: 22, ideal: 18 },
        { date: "Feb 24", remaining: 18, ideal: 12 },
        { date: "Feb 25", remaining: 10, ideal: 6 },
    ];

    const velocityData = velocity?.length ? velocity : [
        { sprint: "Sprint 1", committed: 35, completed: 30 },
        { sprint: "Sprint 2", committed: 40, completed: 38 },
        { sprint: "Sprint 3", committed: 45, completed: 42 },
        { sprint: "Sprint 4", committed: 38, completed: 36 },
        { sprint: "Sprint 5", committed: 50, completed: 48 },
    ];

    const cfdData = cfd?.length ? cfd : Array.from({ length: 14 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (13 - i));
        return {
            date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            DONE: Math.round(i * 3.2 + 2),
            IN_REVIEW: Math.round(2 + Math.sin(i) * 2),
            IN_PROGRESS: Math.round(4 + Math.cos(i) * 1.5),
            TODO: Math.max(0, 15 - i),
            BACKLOG: Math.max(0, 20 - i * 0.8),
        };
    });

    const workloadData = workload?.length ? workload : [
        { name: "Alice", count: 6, points: 18 },
        { name: "Bob", count: 4, points: 12 },
        { name: "Charlie", count: 7, points: 21 },
        { name: "Dana", count: 3, points: 9 },
        { name: "Unassigned", count: 5, points: 0 },
    ];

    const cycleData = cycleTimes?.length ? cycleTimes : [
        { key: "FPM-12", cycleTime: 2, priority: "HIGH" },
        { key: "FPM-8", cycleTime: 5, priority: "MEDIUM" },
        { key: "FPM-15", cycleTime: 1, priority: "URGENT" },
        { key: "FPM-3", cycleTime: 8, priority: "LOW" },
        { key: "FPM-21", cycleTime: 3, priority: "HIGH" },
    ];

    return (
        <div className="h-full overflow-y-auto p-6 space-y-8 max-w-7xl mx-auto">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
                <p className="text-muted-foreground">Team performance, sprint health, and delivery insights.</p>
            </div>

            {/* Row 1: Burndown + Velocity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard>
                    <SectionHeader icon={TrendingDown} title="Sprint Burndown" subtitle="Story points remaining vs ideal trajectory" />
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={burndownData}>
                            <defs>
                                <linearGradient id="burnRemaining" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                            <Legend />
                            <Area type="monotone" dataKey="remaining" stroke={CHART_COLORS.primary} fill="url(#burnRemaining)" strokeWidth={2} name="Remaining" />
                            <Line type="monotone" dataKey="ideal" stroke={CHART_COLORS.warning} strokeDasharray="5 5" dot={false} strokeWidth={1.5} name="Ideal" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard>
                    <SectionHeader icon={Zap} title="Team Velocity" subtitle="Story points committed vs completed per sprint" />
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={velocityData} barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                            <XAxis dataKey="sprint" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                            <Legend />
                            <Bar dataKey="committed" fill={CHART_COLORS.secondary} name="Committed" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="completed" fill={CHART_COLORS.success} name="Completed" radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            {/* Row 2: CFD */}
            <ChartCard>
                <SectionHeader icon={GitBranch} title="Cumulative Flow Diagram" subtitle="Issue count by status over the last 14 days" />
                <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={cfdData} stackOffset="none">
                        <defs>
                            {["DONE", "IN_REVIEW", "IN_PROGRESS", "TODO", "BACKLOG"].map((s, i) => (
                                <linearGradient key={s} id={`cfd-${s}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={Object.values(CHART_COLORS)[i]} stopOpacity={0.85} />
                                    <stop offset="95%" stopColor={Object.values(CHART_COLORS)[i]} stopOpacity={0.6} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                        <Legend />
                        {["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].map((s, i) => (
                            <Area key={s} type="monotone" dataKey={s} stackId="1"
                                stroke={Object.values(CHART_COLORS)[i]}
                                fill={`url(#cfd-${s})`}
                                strokeWidth={1}
                                name={s.replace("_", " ")}
                            />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            </ChartCard>

            {/* Row 3: Cycle Time + Workload */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard>
                    <SectionHeader icon={Clock} title="Cycle Time Distribution" subtitle="Days from creation to Done per ticket" />
                    <div className="space-y-2 mt-2">
                        {cycleData.map((item: any) => (
                            <div key={item.key} className="flex items-center gap-3">
                                <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">{item.key}</span>
                                <div className="flex-1 bg-muted rounded-full h-2">
                                    <div
                                        className="h-2 rounded-full bg-primary"
                                        style={{ width: `${Math.min((item.cycleTime / 14) * 100, 100)}%` }}
                                    />
                                </div>
                                <span className="text-xs font-medium w-12 text-right">{item.cycleTime}d</span>
                            </div>
                        ))}
                    </div>
                </ChartCard>

                <ChartCard>
                    <SectionHeader icon={Users} title="Team Workload" subtitle="Open issues &amp; story points per assignee" />
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={workloadData} layout="vertical" barSize={14}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                            <Legend />
                            <Bar dataKey="count" fill={CHART_COLORS.accent} name="Open Issues" radius={[0, 3, 3, 0]} />
                            <Bar dataKey="points" fill={CHART_COLORS.warning} name="Story Points" radius={[0, 3, 3, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    );
}
