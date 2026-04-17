"use client";

import React, { useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { 
    Activity, 
    TrendingUp, 
    Users, 
    CheckCircle2, 
    Clock, 
    AlertCircle,
    Loader2,
    Zap,
    BarChart3
} from "lucide-react";
import { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    Cell
} from "recharts";

interface TeamProductivityDashboardProps {
    projectId: string;
}

export function TeamProductivityDashboard({ projectId }: TeamProductivityDashboardProps) {
    const { data: velocity, isLoading: vLoading } = trpc.pmAnalytics.velocity.useQuery({ projectId });
    const { data: workload, isLoading: wLoading } = trpc.pmAnalytics.workload.useQuery({ projectId });
    const { data: cycleTime, isLoading: cLoading } = trpc.pmAnalytics.cycleTime.useQuery({ projectId });

    const avgCycleTime = useMemo(() => {
        if (!cycleTime || cycleTime.length === 0) return 0;
        return Math.round(cycleTime.reduce((sum, item) => sum + item.cycleTime, 0) / cycleTime.length);
    }, [cycleTime]);

    if (vLoading || wLoading || cLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
            </div>
        );
    }

    return (
        <div className="space-y-8 p-1 animate-in fade-in duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard 
                    title="Avg Velocity" 
                    value={velocity ? Math.round(velocity.reduce((s, v) => s + v.completed, 0) / (velocity.length || 1)) : 0}
                    sub="Points per sprint"
                    icon={<Zap size={18} className="text-yellow-500" />}
                />
                <MetricCard 
                    title="Avg Cycle Time" 
                    value={`${avgCycleTime}d`}
                    sub="Creation to Done"
                    icon={<Clock size={18} className="text-blue-500" />}
                />
                <MetricCard 
                    title="Active Workload" 
                    value={workload?.reduce((s, w) => s + w.count, 0) || 0}
                    sub="Current in-flight"
                    icon={<Activity size={18} className="text-emerald-500" />}
                />
                <MetricCard 
                    title="Team Size" 
                    value={workload?.length || 0}
                    sub="Active contributors"
                    icon={<Users size={18} className="text-purple-500" />}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Velocity Chart */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold flex items-center gap-2 text-foreground">
                            <TrendingUp size={18} className="text-primary" /> Velocity Trend
                        </h3>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={velocity}>
                                <defs>
                                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="sprint" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="completed" name="Completed Points" stroke="var(--primary)" fillOpacity={1} fill="url(#colorCompleted)" strokeWidth={3} />
                                <Area type="monotone" dataKey="committed" name="Committed Points" stroke="#888" fill="none" strokeDasharray="5 5" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Workload Distribution */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold flex items-center gap-2 text-foreground">
                            <BarChart3 size={18} className="text-emerald-500" /> Workload Distribution
                        </h3>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={workload} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis type="number" axisLine={false} tickLine={false} hide />
                                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#888'}} />
                                <Tooltip 
                                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                                />
                                <Bar dataKey="points" name="Story Points" radius={[0, 4, 4, 0]} barSize={20}>
                                    {workload?.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--primary)' : '#8b5cf6'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Cycle Times */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold flex items-center gap-2 text-foreground">
                        <CheckCircle2 size={18} className="text-indigo-500" /> Recent Closures & Efficiency
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-muted-foreground border-b border-border">
                                <th className="pb-3 font-semibold">Issue</th>
                                <th className="pb-3 font-semibold text-center">Priority</th>
                                <th className="pb-3 font-semibold text-center">Cycle Time</th>
                                <th className="pb-3 font-semibold text-right">Completed</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {cycleTime?.slice(0, 5).map(issue => (
                                <tr key={issue.key} className="group hover:bg-muted/30 transition-colors">
                                    <td className="py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-xs text-primary mb-1">{issue.key}</span>
                                            <span className="font-medium truncate max-w-[400px]">{issue.title}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                            issue.priority === 'URGENT' ? 'bg-red-500/10 text-red-500' :
                                            issue.priority === 'HIGH' ? 'bg-orange-500/10 text-orange-500' :
                                            'bg-secondary text-muted-foreground'
                                        }`}>
                                            {issue.priority}
                                        </span>
                                    </td>
                                    <td className="py-4 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <span className={`font-mono text-xs ${issue.cycleTime > 7 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {issue.cycleTime}d
                                            </span>
                                            {issue.cycleTime > 7 && <AlertCircle size={12} className="text-red-500/50" />}
                                        </div>
                                    </td>
                                    <td className="py-4 text-right text-muted-foreground">
                                        {issue.completedAt}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, sub, icon }: { title: string, value: string | number, sub: string, icon: React.ReactNode }) {
    return (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:border-primary/50 transition-all group overflow-hidden relative">
            <div className="absolute -right-2 -top-2 opacity-10 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-colors">
                    {icon}
                </div>
                <span className="text-xs font-bold text-muted-foreground tracking-wide uppercase">{title}</span>
            </div>
            <div className="space-y-1">
                <div className="text-3xl font-black">{value}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <TrendingUp size={10} className="text-emerald-400" /> {sub}
                </div>
            </div>
        </div>
    );
}
