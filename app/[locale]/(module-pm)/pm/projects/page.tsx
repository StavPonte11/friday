"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { FolderKanban, Plus, Clock, Search, Workflow, Target } from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";

// Mocking Workspace ID for the Foundational Phase setup
const MOCK_WORKSPACE_ID = "cm7k12abc0001xyz";

export default function ProjectsPage() {
    const locale = useLocale();
    const [search, setSearch] = useState("");
    const { data: projects, isLoading } = trpc.pmProjects.list.useQuery({ workspaceId: MOCK_WORKSPACE_ID });

    const filtered = projects?.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.key.toLowerCase().includes(search.toLowerCase())) || [];

    return (
        <div className="h-full flex flex-col p-6 overflow-y-auto w-full max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
                    <p className="text-muted-foreground">Manage your engineering projects, issues, and sprints.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 shadow-sm">
                    <Plus size={16} /> New Project
                </button>
            </div>

            <div className="flex items-center gap-4 bg-card border border-border rounded-lg px-4 py-2 w-full max-w-sm">
                <Search size={16} className="text-muted-foreground" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search projects..."
                    className="bg-transparent border-none outline-none flex-1 text-sm text-foreground"
                />
            </div>

            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 rounded-lg bg-card animate-pulse border border-border"></div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-lg text-muted-foreground">
                    <FolderKanban size={48} className="mb-4 opacity-50" />
                    <p className="font-medium">No projects found.</p>
                    <p className="text-sm">Create a new project to start tracking work.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filtered.map(project => (
                        <Link
                            key={project.id}
                            href={`/${locale}/pm/projects/${project.id}`}
                            className="group border border-border rounded-lg bg-card p-5 hover:border-primary/50 transition-all hover:shadow-md flex flex-col"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold shadow-inner">
                                        {project.key.substring(0, 1)}
                                    </div>
                                    <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">{project.name}</h3>
                                </div>
                                <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground border border-border/50">
                                    {project.key}
                                </span>
                            </div>

                            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                                {project.description || "No description provided."}
                            </p>

                            <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border pt-4">
                                <div className="flex items-center gap-1.5" title="Active Sprints">
                                    <Target size={14} className="text-blue-500" />
                                    <span>{project._count?.sprints || 0} Sprints</span>
                                </div>
                                <div className="flex items-center gap-1.5" title="Total Issues">
                                    <Workflow size={14} className="text-purple-500" />
                                    <span>{project._count?.issues || 0} Issues</span>
                                </div>
                                <div className="ml-auto flex items-center gap-1.5" title={`Updated ${new Date(project.updatedAt).toLocaleDateString()}`}>
                                    <Clock size={14} />
                                    <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
