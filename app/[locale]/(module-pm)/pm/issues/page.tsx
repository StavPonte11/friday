"use client";

import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { ListOrdered, Filter, CircleDashed, CheckCircle2, AlertCircle, Building } from "lucide-react";
import { useLocale } from "next-intl";
import {  PmIssuePriority } from "@prisma/client";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { IssueEditor } from "@/components/issues/IssueEditor";
import { IssueInsightsPanel } from "@/components/issues/IssueInsightsPanel";
import { IssueFilters } from "@/components/issues/IssueFilters";
import { BulkActionsBar } from "@/components/issues/BulkActionsBar";

// Simplified mapping for foundatoin phase
const statusIcons = {
    ["TODO"]: <CircleDashed size={16} className="text-muted-foreground" />,
    ["IN_PROGRESS"]: <CircleDashed size={16} className="text-blue-500" />,
    ["DONE"]: <CheckCircle2 size={16} className="text-green-500" />,
    ["BACKLOG"]: <CircleDashed size={16} className="text-muted-foreground opacity-50" />,
    ["IN_REVIEW"]: <AlertCircle size={16} className="text-purple-500" />,
    ["CANCELED"]: <AlertCircle size={16} className="text-red-500 line-through" />,
};

export default function IssuesPage() {
    const locale = useLocale();
    const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    const [filters, setFilters] = useState<any>({ projectId: "" });
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Fetch all PM Projects
    const { data: projects, isLoading: isProjectsLoading } = trpc.pmProjects.list.useQuery();

    useEffect(() => {
        if (projects && projects.length > 0 && (!selectedProjectId || !projects.find((p: any) => p.id === selectedProjectId))) {
            setSelectedProjectId(projects[0].id);
            setFilters({ projectId: projects[0].id });
        } else if (projects?.length === 0) {
            setSelectedProjectId("");
            setFilters({ projectId: "" });
        }
    }, [projects, selectedProjectId]);

    const { data: issues, isLoading, refetch } = trpc.pmIssues.listByProject.useQuery(
        filters,
        { enabled: !!filters.projectId }
    );

    const toggleSelection = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const selectedIssue = issues?.find((i: any) => i.id === selectedIssueId);

    return (
        <div className="flex h-full max-w-7xl mx-auto overflow-hidden">
            <div className={`flex flex-col flex-1 p-6 overflow-y-auto space-y-6 ${selectedIssueId ? 'hidden md:flex md:w-1/2' : 'w-full'}`}>
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Issues</h2>
                        <p className="text-muted-foreground">Manage and track work items across the project.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2 shadow-sm">
                            <Building size={16} className="text-muted-foreground" />
                            <select 
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer outline-none w-40"
                                disabled={isProjectsLoading}
                            >
                                {isProjectsLoading ? (
                                    <option>Loading...</option>
                                ) : projects?.length ? (
                                    projects.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))
                                ) : (
                                    <option value="">No projects</option>
                                )}
                            </select>
                        </div>
                        {selectedProjectId && projects && <CreateIssueModal 
                            projectId={selectedProjectId} 
                            workspaceId={projects.find((p: any) => p.id === selectedProjectId)?.workspaceId || ""} 
                        />}
                    </div>
                </div>

                <IssueFilters 
                    projectId={selectedProjectId} 
                    currentFilters={filters} 
                    onFilterChange={setFilters} 
                />

                {isLoading ? (
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map((i: any) => (
                            <div key={i} className="h-16 rounded-lg bg-card animate-pulse border border-border"></div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 relative">
                        {issues?.map((issue: any) => (
                            <div
                                key={issue.id}
                                onClick={() => setSelectedIssueId(issue.id)}
                                className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all group ${selectedIssueId === issue.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-border/80'}`}
                            >
                                <div 
                                    className={`flex-shrink-0 w-5 h-5 border rounded flex items-center justify-center transition-colors ${selectedIds.includes(issue.id) ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'}`}
                                    onClick={(e) => toggleSelection(issue.id, e)}
                                >
                                    {selectedIds.includes(issue.id) && <CheckCircle2 size={12} className="text-primary-foreground" />}
                                </div>
                                <div className="flex-shrink-0" title={issue.status}>
                                    {statusIcons[issue.status as keyof typeof statusIcons] || statusIcons["TODO"]}
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="font-semibold text-sm truncate text-foreground">{issue.title}</span>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <span className="font-mono uppercase px-1.5 py-0.5 bg-muted rounded border border-border/50">{issue.key}</span>
                                        {issue.priority !== PmIssuePriority.NONE && (
                                            <span className="capitalize">{issue.priority.toLowerCase()} Priority</span>
                                        )}
                                        {issue.type && (
                                            <span className="px-1 py-0.5 bg-secondary rounded text-[10px] uppercase font-bold">{issue.type}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-shrink-0">
                                    {issue.assignee ? (
                                        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-secondary-foreground" title={issue.assignee.name || ''}>
                                            {issue.assignee.name?.substring(0, 2).toUpperCase()}
                                        </div>
                                    ) : (
                                        <div className="w-6 h-6 rounded-full border border-dashed border-border flex items-center justify-center bg-card text-muted-foreground">
                                            ?
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {issues?.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-48 border border-dashed border-border rounded-lg text-muted-foreground text-sm">
                                <ListOrdered size={32} className="mb-2 opacity-50" />
                                <p>No issues found in this project.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <BulkActionsBar 
                projectId={selectedProjectId}
                selectedIds={selectedIds}
                onClearSelection={() => setSelectedIds([])}
                onSuccess={() => refetch()}
            />

            {/* Slide Over Details Pane */}
            {selectedIssueId && selectedIssue && (
                <div className="w-full md:w-[600px] border-l border-border bg-card flex flex-col shadow-xl h-full slide-over animate-in slide-in-from-right">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <div className="flex items-center gap-2 text-sm text-primary font-mono bg-primary/10 px-2 py-1 rounded">
                            {selectedIssue.key}
                        </div>
                        <button
                            onClick={() => setSelectedIssueId(null)}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-md"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <IssueEditor issueId={selectedIssue.id} projectId={selectedProjectId} />
                    </div>
                </div>
            )}
        </div>
    );
}
