"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { FolderKanban, Plus, Clock, Search, Workflow, Target, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";

// ─── Skeleton card shown while data loads ───────────────────────────────────
function ProjectCardSkeleton() {
    return (
        <div className="border border-border rounded-lg bg-card p-5 flex flex-col gap-3 animate-pulse">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-muted" />
                <div className="h-5 w-40 bg-muted rounded" />
                <div className="ml-auto h-5 w-12 bg-muted rounded" />
            </div>
            <div className="space-y-2 flex-1">
                <div className="h-3 w-full bg-muted rounded" />
                <div className="h-3 w-3/4 bg-muted rounded" />
            </div>
            <div className="flex items-center gap-4 border-t border-border pt-4">
                <div className="h-3 w-20 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
                <div className="ml-auto h-3 w-24 bg-muted rounded" />
            </div>
        </div>
    );
}

export default function ProjectsPage() {
    const locale = useLocale();
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [name, setName] = useState("");
    const [key, setKey] = useState("");
    const [description, setDescription] = useState("");
    const [formError, setFormError] = useState("");

    // Fetch the first available workspace — replaces the hardcoded MOCK id
    const { data: workspaces, isLoading: wsLoading } = trpc.workspaces.list.useQuery();
    const workspaceId = workspaces?.[0]?.id ?? null;

    const utils = trpc.useUtils();

    const { data: projects, isLoading: projectsLoading } =
        trpc.pmProjects.list.useQuery();

    const createProject = trpc.pmProjects.create.useMutation({
        onSuccess: () => {
            // Invalidate cache so the new project appears immediately
            utils.pmProjects.list.invalidate();
            closeModal();
        },
        onError: (err) => {
            setFormError(err.message || "Failed to create project.");
        },
    });

    const isLoading = wsLoading || projectsLoading;

    const filtered =
        projects?.filter(
            (p: any) =>
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.key.toLowerCase().includes(search.toLowerCase())
        ) || [];

    function openModal() {
        setName("");
        setKey("");
        setDescription("");
        setFormError("");
        setIsModalOpen(true);
    }

    function closeModal() {
        setIsModalOpen(false);
        setFormError("");
    }

    function handleKeyInput(val: string) {
        // Auto-uppercase and strip non-alpha-numeric chars
        setKey(val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10));
    }

    function handleSubmit() {
        setFormError("");
        if (!name.trim()) { setFormError("Project name is required."); return; }
        if (key.length < 2) { setFormError("Key must be at least 2 characters."); return; }
        if (!workspaceId) { setFormError("No workspace found. Please create a workspace first."); return; }
        createProject.mutate({ workspaceId, name: name.trim(), key, description: description.trim() || undefined });
    }

    return (
        <div className="h-full flex flex-col p-6 overflow-y-auto w-full max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
                    <p className="text-muted-foreground">Manage your engineering projects, issues, and sprints.</p>
                </div>
                <button
                    onClick={openModal}
                    disabled={isLoading || !workspaceId}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                    <Plus size={16} /> New Project
                </button>
            </div>

            {/* Search */}
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

            {/* Workspace loading indicator */}
            {wsLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Connecting to workspace…</span>
                </div>
            )}

            {/* No workspace found */}
            {!wsLoading && !workspaceId && (
                <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-lg text-muted-foreground gap-2">
                    <AlertCircle size={36} className="opacity-50" />
                    <p className="font-medium">No workspace found.</p>
                    <p className="text-sm">Please set up a workspace before managing projects.</p>
                </div>
            )}

            {/* Loading skeletons */}
            {isLoading && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <ProjectCardSkeleton />
                    <ProjectCardSkeleton />
                    <ProjectCardSkeleton />
                </div>
            )}

            {/* Empty state */}
            {!isLoading && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-lg text-muted-foreground">
                    <FolderKanban size={48} className="mb-4 opacity-50" />
                    <p className="font-medium">No projects found.</p>
                    <p className="text-sm">Create a new project to start tracking work.</p>
                </div>
            )}

            {/* Project grid */}
            {!isLoading && filtered.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((project: any) => (
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
                                <div className="flex items-center gap-1.5" title="Sprints">
                                    <Target size={14} className="text-blue-500" />
                                    <span>{project._count?.sprints || 0} Sprints</span>
                                </div>
                                <div className="flex items-center gap-1.5" title="Issues">
                                    <Workflow size={14} className="text-purple-500" />
                                    <span>{project._count?.issues || 0} Issues</span>
                                </div>
                                <div className="ml-auto flex items-center gap-1.5">
                                    <Clock size={14} />
                                    <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Create Project Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-1">Create New Project</h3>
                        <p className="text-sm text-muted-foreground mb-6">Define your new project scope and key.</p>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Project Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-background border border-border text-foreground rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="E.g. Engineering Platform"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Project Key</label>
                                <input
                                    type="text"
                                    value={key}
                                    onChange={(e) => handleKeyInput(e.target.value)}
                                    className="w-full bg-background border border-border text-foreground rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                                    placeholder="E.g. ENG"
                                    maxLength={10}
                                />
                                <p className="text-xs text-muted-foreground mt-1">2–10 uppercase letters/digits. Auto-formatted.</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Description <span className="font-normal text-muted-foreground">(optional)</span></label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={2}
                                    className="w-full bg-background border border-border text-foreground rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                    placeholder="Brief description of the project…"
                                />
                            </div>
                        </div>

                        {/* Inline error */}
                        {formError && (
                            <div className="flex items-center gap-2 text-sm text-destructive mb-4 bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                                <AlertCircle size={14} className="shrink-0" />
                                <span>{formError}</span>
                            </div>
                        )}

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={closeModal}
                                disabled={createProject.isPending}
                                className="px-4 py-2 hover:bg-muted text-foreground rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={createProject.isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-70"
                            >
                                {createProject.isPending ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Creating…
                                    </>
                                ) : (
                                    "Create Project"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
