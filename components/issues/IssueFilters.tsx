"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Filter, Save, X, ChevronDown, Check, Bookmark } from "lucide-react";
import { PmIssuePriority, PmIssueType } from "@prisma/client";

interface IssueFiltersProps {
    projectId: string;
    onFilterChange: (filters: any) => void;
    currentFilters: any;
}

export function IssueFilters({ projectId, onFilterChange, currentFilters }: IssueFiltersProps) {
    const [isSavingView, setIsSavingView] = useState(false);
    const [viewName, setViewName] = useState("");

    const { data: members } = trpc.pmProjects.listMembers.useQuery({ projectId });
    const { data: sprints } = trpc.pmSprints.listByProject.useQuery({ projectId });
    const { data: versions } = trpc.pmVersions.list.useQuery({ projectId });
    const { data: savedViews, refetch: refetchViews } = trpc.pmSavedViews.list.useQuery({ projectId });

    const createViewMutation = trpc.pmSavedViews.create.useMutation({
        onSuccess: () => {
            setIsSavingView(false);
            setViewName("");
            refetchViews();
        }
    });

    const updateFilter = (key: string, value: any) => {
        onFilterChange({ ...currentFilters, [key]: value });
    };

    const clearFilters = () => {
        onFilterChange({ projectId });
    };

    const handleSaveView = () => {
        if (!viewName.trim()) return;
        createViewMutation.mutate({
            projectId,
            userId: "current-user-id", // Should be from session
            name: viewName,
            filters: currentFilters
        });
    };

    const applySavedView = (view: any) => {
        onFilterChange(view.filters);
    };

    return (
        <div className="flex flex-col gap-4 bg-card border border-border p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-primary" />
                    <h3 className="font-semibold text-sm">Filters</h3>
                </div>
                <button
                    onClick={clearFilters}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    Clear All
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Status Filter */}
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Status</label>
                    <select
                        value={currentFilters.statusIn?.[0] || ""}
                        onChange={(e) => updateFilter("statusIn", e.target.value ? [e.target.value] : undefined)}
                        className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                    >
                        <option value="">All Statuses</option>
                        <option value="BACKLOG">Backlog</option>
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="DONE">Done</option>
                    </select>
                </div>

                {/* Assignee Filter */}
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Assignee</label>
                    <select
                        value={currentFilters.assigneeId || ""}
                        onChange={(e) => updateFilter("assigneeId", e.target.value || undefined)}
                        className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                    >
                        <option value="">All Assignees</option>
                        {members?.map((m: any) => (
                            <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
                        ))}
                    </select>
                </div>

                {/* Priority Filter */}
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Priority</label>
                    <select
                        value={currentFilters.priority || ""}
                        onChange={(e) => updateFilter("priority", e.target.value || undefined)}
                        className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                    >
                        <option value="">All Priorities</option>
                        {Object.values(PmIssuePriority).map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </div>

                {/* Type Filter */}
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Type</label>
                    <select
                        value={currentFilters.type || ""}
                        onChange={(e) => updateFilter("type", e.target.value || undefined)}
                        className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                    >
                        <option value="">All Types</option>
                        {Object.values(PmIssueType).map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>

                {/* Sprint Filter */}
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Sprint</label>
                    <select
                        value={currentFilters.sprintId || ""}
                        onChange={(e) => updateFilter("sprintId", e.target.value || undefined)}
                        className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                    >
                        <option value="">All Sprints</option>
                        {sprints?.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                {/* Version Filter */}
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Version</label>
                    <select
                        value={currentFilters.versionId || ""}
                        onChange={(e) => updateFilter("versionId", e.target.value || undefined)}
                        className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                    >
                        <option value="">All Versions</option>
                        {versions?.map((v: any) => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <Bookmark size={14} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Saved Views:</span>
                    {savedViews?.map((view: any) => (
                        <button
                            key={view.id}
                            onClick={() => applySavedView(view)}
                            className="px-2 py-1 rounded bg-secondary/50 text-[11px] hover:bg-secondary transition-colors whitespace-nowrap"
                        >
                            {view.name}
                        </button>
                    ))}
                    {savedViews?.length === 0 && <span className="text-[11px] italic text-muted-foreground">None</span>}
                </div>

                <div className="flex items-center gap-2">
                    {isSavingView ? (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                            <input
                                type="text"
                                value={viewName}
                                onChange={(e) => setViewName(e.target.value)}
                                placeholder="View name..."
                                className="bg-background border border-border rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary w-32"
                                autoFocus
                            />
                            <button onClick={handleSaveView} className="text-primary hover:text-primary/80"><Check size={16} /></button>
                            <button onClick={() => setIsSavingView(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsSavingView(true)}
                            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                            <Save size={14} />
                            Save View
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
