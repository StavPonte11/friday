"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { ListOrdered, Plus, Filter, CircleDashed, CheckCircle2, AlertCircle } from "lucide-react";
import { useLocale } from "next-intl";
import { PmIssueStatus, PmIssuePriority } from "@prisma/client";

// Simplified mapping for foundatoin phase
const statusIcons = {
    [PmIssueStatus.TODO]: <CircleDashed size={16} className="text-muted-foreground" />,
    [PmIssueStatus.IN_PROGRESS]: <CircleDashed size={16} className="text-blue-500" />,
    [PmIssueStatus.DONE]: <CheckCircle2 size={16} className="text-green-500" />,
    [PmIssueStatus.BACKLOG]: <CircleDashed size={16} className="text-muted-foreground opacity-50" />,
    [PmIssueStatus.IN_REVIEW]: <AlertCircle size={16} className="text-purple-500" />,
    [PmIssueStatus.CANCELED]: <AlertCircle size={16} className="text-red-500 line-through" />,
};

// Hardcoded for foundational mock testing matching the active project
const MOCK_PROJECT_ID = "cm7k12abc0001xyz";

export default function IssuesPage() {
    const locale = useLocale();
    const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

    const { data: issues, isLoading } = trpc.pmIssues.listByProject.useQuery({ projectId: MOCK_PROJECT_ID });

    return (
        <div className="flex h-full max-w-7xl mx-auto overflow-hidden">
            <div className={`flex flex-col flex-1 p-6 overflow-y-auto space-y-6 ${selectedIssueId ? 'hidden md:flex md:w-1/2' : 'w-full'}`}>
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Issues</h2>
                        <p className="text-muted-foreground">Manage and track work items across the project.</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
                        <Plus size={16} /> New Issue
                    </button>
                </div>

                <div className="flex items-center gap-2 bg-card border border-border p-2 rounded-lg">
                    <Filter size={16} className="text-muted-foreground ml-2" />
                    <input type="text" placeholder="Filter issues..." className="bg-transparent border-none outline-none flex-1 text-sm placeholder:text-muted-foreground text-foreground px-2" />
                </div>

                {isLoading ? (
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-16 rounded-lg bg-card animate-pulse border border-border"></div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 relative">
                        {issues?.map((issue) => (
                            <div
                                key={issue.id}
                                onClick={() => setSelectedIssueId(issue.id)}
                                className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${selectedIssueId === issue.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-border/80'}`}
                            >
                                <div className="flex-shrink-0" title={issue.status}>
                                    {statusIcons[issue.status as PmIssueStatus] || statusIcons[PmIssueStatus.TODO]}
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="font-semibold text-sm truncate text-foreground">{issue.title}</span>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <span className="font-mono uppercase px-1.5 py-0.5 bg-muted rounded border border-border/50">{issue.key}</span>
                                        {issue.priority !== PmIssuePriority.NONE && (
                                            <span className="capitalize">{issue.priority.toLowerCase()} Priority</span>
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

            {/* Slide Over Details Pane */}
            {selectedIssueId && (
                <div className="w-full md:w-[600px] border-l border-border bg-card flex flex-col shadow-xl h-full slide-over animate-in slide-in-from-right">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <div className="flex items-center gap-2 text-sm text-primary font-mono bg-primary/10 px-2 py-1 rounded">
                            {issues?.find(i => i.id === selectedIssueId)?.key}
                        </div>
                        <button
                            onClick={() => setSelectedIssueId(null)}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-md"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Complex Rich Text / Tiptap implementation will go here. For now rendering placeholders. */}
                        <h2 className="text-xl font-bold">{issues?.find(i => i.id === selectedIssueId)?.title}</h2>
                        <div className="prose prose-sm dark:prose-invert">
                            <p className="text-muted-foreground">{issues?.find(i => i.id === selectedIssueId)?.description || "No description provided. Click to add one."}</p>
                        </div>

                        <div className="border border-border rounded-lg p-4 grid grid-cols-2 gap-4 bg-muted/30">
                            <div>
                                <span className="text-xs text-muted-foreground block mb-1">Status</span>
                                <div className="text-sm font-medium capitalize flex items-center gap-2">
                                    {statusIcons[issues?.find(i => i.id === selectedIssueId)?.status as PmIssueStatus || PmIssueStatus.TODO]}
                                    {issues?.find(i => i.id === selectedIssueId)?.status.replace('_', ' ').toLowerCase()}
                                </div>
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground block mb-1">Assignee</span>
                                <div className="text-sm font-medium">Unassigned</div>
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground block mb-1">Priority</span>
                                <div className="text-sm font-medium capitalize">
                                    {issues?.find(i => i.id === selectedIssueId)?.priority.toLowerCase()}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-border bg-muted/20">
                        <input type="text" placeholder="Add a comment..." className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                </div>
            )}
        </div>
    );
}
