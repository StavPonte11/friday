"use client";

import React from "react";
import { trpc } from "@/lib/trpc/client";
import {
    X,
    UserPlus,
    CheckCircle2,
    Flag,
    Layers,
    Trash2,
    Loader2
} from "lucide-react";
import { PmIssuePriority } from "@prisma/client";

interface BulkActionsBarProps {
    projectId: string;
    selectedIds: string[];
    onClearSelection: () => void;
    onSuccess: () => void;
}

export function BulkActionsBar({ projectId, selectedIds, onClearSelection, onSuccess }: BulkActionsBarProps) {
    const utils = trpc.useUtils();
    const { data: members } = trpc.pmProjects.listMembers.useQuery({ projectId });
    const { data: sprints } = trpc.pmSprints.listByProject.useQuery({ projectId });

    const bulkUpdateMutation = trpc.pmIssues.bulkUpdate.useMutation({
        onSuccess: () => {
            utils.pmIssues.listByProject.invalidate();
            onClearSelection();
            onSuccess();
        }
    });

    if (selectedIds.length === 0) return null;

    const handleBulkUpdate = (patch: any) => {
        bulkUpdateMutation.mutate({
            ids: selectedIds,
            patch,
            actorId: "current-user-id" // Should be from session
        });
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-foreground text-background px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 border border-border/10 backdrop-blur-md bg-opacity-90">
                <div className="flex items-center gap-2 border-r border-background/20 pr-4">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                        {selectedIds.length}
                    </span>
                    <span className="text-sm font-medium">Selected</span>
                    <button
                        onClick={onClearSelection}
                        className="ml-2 p-1 hover:bg-background/10 rounded-full transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    {/* Bulk Status */}
                    <div className="group relative">
                        <button className="flex items-center gap-1.5 text-xs font-semibold hover:text-primary transition-colors">
                            <CheckCircle2 size={16} /> Status
                        </button>
                        <div className="absolute bottom-full mb-2 left-0 hidden group-hover:block bg-background text-foreground border border-border rounded-lg shadow-xl p-1 min-w-[120px]">
                            {["BACKLOG", "TODO", "IN_PROGRESS", "DONE"].map(s => (
                                <button
                                    key={s}
                                    onClick={() => handleBulkUpdate({ status: s })}
                                    className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted rounded-md transition-colors capitalize"
                                >
                                    {s.toLowerCase().replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bulk Assignee */}
                    <div className="group relative">
                        <button className="flex items-center gap-1.5 text-xs font-semibold hover:text-primary transition-colors">
                            <UserPlus size={16} /> Assign
                        </button>
                        <div className="absolute bottom-full mb-2 left-0 hidden group-hover:block bg-background text-foreground border border-border rounded-lg shadow-xl p-1 min-w-[150px] max-h-[200px] overflow-y-auto">
                            <button
                                onClick={() => handleBulkUpdate({ assigneeId: null })}
                                className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted rounded-md transition-colors"
                            >
                                Unassigned
                            </button>
                            {members?.map((m: any) => (
                                <button
                                    key={m.user.id}
                                    onClick={() => handleBulkUpdate({ assigneeId: m.user.id })}
                                    className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted rounded-md transition-colors"
                                >
                                    {m.user.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bulk Priority */}
                    <div className="group relative">
                        <button className="flex items-center gap-1.5 text-xs font-semibold hover:text-primary transition-colors">
                            <Flag size={16} /> Priority
                        </button>
                        <div className="absolute bottom-full mb-2 left-0 hidden group-hover:block bg-background text-foreground border border-border rounded-lg shadow-xl p-1 min-w-[120px]">
                            {Object.values(PmIssuePriority).map(p => (
                                <button
                                    key={p}
                                    onClick={() => handleBulkUpdate({ priority: p })}
                                    className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted rounded-md transition-colors capitalize"
                                >
                                    {p.toLowerCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bulk Sprint */}
                    <div className="group relative">
                        <button className="flex items-center gap-1.5 text-xs font-semibold hover:text-primary transition-colors">
                            <Layers size={16} /> Sprint
                        </button>
                        <div className="absolute bottom-full mb-2 left-0 hidden group-hover:block bg-background text-foreground border border-border rounded-lg shadow-xl p-1 min-w-[150px] max-h-[200px] overflow-y-auto">
                            <button
                                onClick={() => handleBulkUpdate({ sprintId: null })}
                                className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted rounded-md transition-colors"
                            >
                                Backlog
                            </button>
                            {sprints?.map((s: any) => (
                                <button
                                    key={s.id}
                                    onClick={() => handleBulkUpdate({ sprintId: s.id })}
                                    className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted rounded-md transition-colors"
                                >
                                    {s.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bulk Delete */}
                    <button
                        onClick={() => { if (confirm("Delete selected issues?")) handleBulkUpdate({ delete: true }) }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
                    >
                        <Trash2 size={16} /> Delete
                    </button>
                </div>

                {bulkUpdateMutation.isPending && (
                    <div className="ml-2">
                        <Loader2 size={16} className="animate-spin text-primary" />
                    </div>
                )}
            </div>
        </div>
    );
}
