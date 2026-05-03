"use client";

import { useState, useEffect } from "react";
import { X, CheckSquare, Loader2, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface Props {
    selectedIds: string[];
    projectId: string;
    onClear: () => void;
    onComplete: () => void;
}

export function BulkActionsBar({ selectedIds, projectId, onClear, onComplete }: Props) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(selectedIds.length > 0);
    }, [selectedIds]);

    const bulkUpdate = trpc.pmBulk.updateIssues.useMutation({ onSuccess: onComplete });
    const bulkDelete = trpc.pmBulk.deleteIssues.useMutation({ onSuccess: () => { onClear(); onComplete(); } });
    const assignSprint = trpc.pmBulk.assignSprint.useMutation({ onSuccess: onComplete });

    const { data: sprints } = trpc.pmSprints.listByProject.useQuery(
        { projectId },
        { enabled: selectedIds.length > 0 }
    );

    if (!visible || selectedIds.length === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-600 shadow-2xl shadow-black/40">
                {/* Count badge */}
                <div className="flex items-center gap-2 pr-3 border-r border-zinc-600">
                    <CheckSquare className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-semibold text-zinc-100">
                        {selectedIds.length} selected
                    </span>
                </div>

                {/* Status quick-set */}
                <div className="flex items-center gap-1">
                    {["todo", "in_progress", "done"].map(status => (
                        <button
                            key={status}
                            onClick={() => bulkUpdate.mutate({ issueIds: selectedIds, status })}
                            disabled={bulkUpdate.isPending}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors capitalize disabled:opacity-50"
                        >
                            {status.replace("_", " ")}
                        </button>
                    ))}
                </div>

                <div className="w-px h-5 bg-zinc-600" />

                {/* Priority quick-set */}
                <div className="flex items-center gap-1">
                    {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(p => (
                        <button
                            key={p}
                            onClick={() => bulkUpdate.mutate({ issueIds: selectedIds, priority: p })}
                            disabled={bulkUpdate.isPending}
                            title={p}
                            className={`text-xs px-2 py-1.5 rounded font-medium transition-colors disabled:opacity-50 ${
                                p === "CRITICAL" ? "bg-red-900/40 text-red-400 hover:bg-red-900/60" :
                                p === "HIGH" ? "bg-orange-900/40 text-orange-400 hover:bg-orange-900/60" :
                                p === "MEDIUM" ? "bg-yellow-900/40 text-yellow-400 hover:bg-yellow-900/60" :
                                "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
                            }`}
                        >
                            {p[0]}
                        </button>
                    ))}
                </div>

                <div className="w-px h-5 bg-zinc-600" />

                {/* Move to sprint */}
                {sprints && sprints.length > 0 && (
                    <select
                        onChange={(e) => {
                            if (!e.target.value) return;
                            assignSprint.mutate({ issueIds: selectedIds, sprintId: e.target.value === "backlog" ? null : e.target.value });
                        }}
                        defaultValue=""
                        className="text-xs bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1.5 text-zinc-300 focus:outline-none cursor-pointer"
                    >
                        <option value="" disabled>Move to sprint…</option>
                        <option value="backlog">→ Backlog</option>
                        {sprints.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                )}

                <div className="w-px h-5 bg-zinc-600" />

                {/* Delete */}
                <button
                    onClick={() => {
                        if (confirm(`Delete ${selectedIds.length} issues? This cannot be undone.`)) {
                            bulkDelete.mutate({ issueIds: selectedIds, projectId });
                        }
                    }}
                    disabled={bulkDelete.isPending}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    title="Delete selected"
                >
                    {bulkDelete.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>

                {/* Clear */}
                <button
                    onClick={onClear}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
                    title="Clear selection"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
