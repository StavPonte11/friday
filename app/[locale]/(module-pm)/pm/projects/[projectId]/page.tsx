"use client";

import React, { use } from "react";
import { trpc } from "@/lib/trpc/client";
import { ArrowLeft, LayoutDashboard, ListTodo, Activity } from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";

export default function ProjectDetailsPage(props: { params: Promise<{ locale: string, projectId: string }> }) {
    const { locale, projectId } = use(props.params);

    // Fetch project details
    const { data: project, isLoading } = trpc.pmProjects.get.useQuery({ id: projectId });

    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-6 w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
                <div className="w-16 h-16 relative flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                    <Activity className="absolute inset-0 m-auto text-primary w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-2 text-center">
                    <h3 className="text-xl font-bold tracking-tight">Loading Project...</h3>
                    <p className="text-sm text-muted-foreground">Gathering sprints, issues, and analytics.</p>
                </div>
            </div>
        );
    }

    if (!project) {
        return <div className="p-6">Project not found.</div>;
    }

    return (
        <div className="h-full flex flex-col p-6 overflow-y-auto w-full max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/${locale}/pm/projects`} className="p-2 hover:bg-muted rounded-full transition-colors">
                    <ArrowLeft size={20} className="text-muted-foreground" />
                </Link>
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shadow-inner">
                            {project.key.substring(0, 1)}
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight">{project.name}</h2>
                        <span className="font-mono text-sm bg-muted px-2 py-1 rounded text-muted-foreground border border-border/50">
                            {project.key}
                        </span>
                    </div>
                    {project.description && (
                        <p className="text-muted-foreground mt-2 max-w-2xl">{project.description}</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                {/* Board Link */}
                <Link href={`/${locale}/pm/board`} className="group border border-border rounded-xl bg-card p-6 hover:border-primary/50 transition-all hover:shadow-md flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 transition-transform">
                        <LayoutDashboard size={24} />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Active Board</h3>
                    <p className="text-sm text-muted-foreground">Manage currently active sprints and track issue progress.</p>
                </Link>

                {/* Backlog Link */}
                <Link href={`/${locale}/pm/issues`} className="group border border-border rounded-xl bg-card p-6 hover:border-primary/50 transition-all hover:shadow-md flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 mb-4 group-hover:scale-110 transition-transform">
                        <ListTodo size={24} />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Backlog & Issues</h3>
                    <p className="text-sm text-muted-foreground">View all issues, plan upcoming sprints, and prioritize work.</p>
                </Link>

                {/* Analytics Link */}
                <Link href={`/${locale}/pm/analytics`} className="group border border-border rounded-xl bg-card p-6 hover:border-primary/50 transition-all hover:shadow-md flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-4 group-hover:scale-110 transition-transform">
                        <Activity size={24} />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Sprint Analytics</h3>
                    <p className="text-sm text-muted-foreground">Analyze sprint health, velocity, and AI-driven insights.</p>
                </Link>
            </div>
        </div>
    );
}
