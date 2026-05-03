"use client";

import { GitMerge, AlertOctagon, ArrowRight, X, Plus, Search } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useState } from "react";

const TYPE_CONFIG = {
    blocks: { label: "Blocks", icon: <AlertOctagon className="w-3.5 h-3.5 text-orange-400" />, color: "border-orange-500/20 bg-orange-500/5" },
    blockedBy: { label: "Blocked by", icon: <AlertOctagon className="w-3.5 h-3.5 text-red-400" />, color: "border-red-500/20 bg-red-500/5" },
    relatesTo: { label: "Relates to", icon: <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />, color: "border-zinc-700/50 bg-zinc-800/30" },
    duplicates: { label: "Duplicates", icon: <GitMerge className="w-3.5 h-3.5 text-purple-400" />, color: "border-purple-500/20 bg-purple-500/5" },
};

interface Issue { id: string; key: string; title: string; status: string }

interface Props {
    issueId: string;
    projectId: string;
}

export function DependencyList({ issueId, projectId }: Props) {
    const [showForm, setShowForm] = useState(false);
    const [linkType, setLinkType] = useState<"BLOCKS" | "IS_BLOCKED_BY" | "RELATES_TO" | "DUPLICATES">("BLOCKS");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

    const { data: deps, refetch } = trpc.pmDependencies.list.useQuery({ issueId });
    const removeMutation = trpc.pmDependencies.remove.useMutation({ onSuccess: () => refetch() });
    const addMutation = trpc.pmDependencies.add.useMutation({
        onSuccess: () => { refetch(); setShowForm(false); setSelectedIssue(null); setSearchQuery(""); }
    });

    const { data: searchResults } = trpc.pmSearch.search.useQuery(
        { query: searchQuery, projectId },
        { enabled: searchQuery.length > 1 }
    );

    const allDeps = {
        blocks: deps?.blocks ?? [],
        blockedBy: deps?.blockedBy ?? [],
        relatesTo: deps?.relatesTo ?? [],
        duplicates: deps?.duplicates ?? [],
    };
    const total = Object.values(allDeps).reduce((s, arr) => s + arr.length, 0);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Dependencies {total > 0 && <span className="ml-1 text-zinc-500">({total})</span>}
                </h4>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                    <Plus className="w-3 h-3" /> Add
                </button>
            </div>

            {showForm && (
                <div className="p-3 space-y-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700">
                    <select
                        value={linkType}
                        onChange={e => setLinkType(e.target.value as any)}
                        className="w-full text-sm bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500"
                    >
                        <option value="BLOCKS">Blocks</option>
                        <option value="IS_BLOCKED_BY">Is blocked by</option>
                        <option value="RELATES_TO">Relates to</option>
                        <option value="DUPLICATES">Duplicates</option>
                    </select>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setSelectedIssue(null); }}
                            placeholder="Search issues..."
                            className="w-full text-sm bg-zinc-900 border border-zinc-700 rounded pl-8 pr-3 py-1.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                        />
                    </div>
                    {!selectedIssue && searchResults && searchResults.length > 0 && (
                        <div className="max-h-40 overflow-y-auto rounded border border-zinc-700 divide-y divide-zinc-700/50">
                            {(searchResults as Issue[]).map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => { setSelectedIssue(r as Issue); setSearchQuery(`${r.key} — ${r.title}`); }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-700/50 transition-colors"
                                >
                                    <span className="text-zinc-400 font-mono text-xs mr-2">{r.key}</span>
                                    <span className="text-zinc-200">{r.title}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                if (!selectedIssue) return;
                                addMutation.mutate({ sourceIssueId: issueId, targetIssueId: selectedIssue.id, type: linkType });
                            }}
                            disabled={!selectedIssue || addMutation.isPending}
                            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50 transition-colors"
                        >
                            Add Link
                        </button>
                        <button onClick={() => setShowForm(false)} className="text-xs px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {total === 0 && !showForm && (
                <p className="text-xs text-zinc-500 italic">No dependencies.</p>
            )}

            {(Object.entries(allDeps) as [keyof typeof TYPE_CONFIG, Issue[]][]).map(([type, issues]) =>
                issues.length > 0 && (
                    <div key={type} className="space-y-1">
                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                            {TYPE_CONFIG[type].icon} {TYPE_CONFIG[type].label}
                        </p>
                        {issues.map(issue => (
                            <div
                                key={issue.id}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs group ${TYPE_CONFIG[type].color}`}
                            >
                                <span className="font-mono text-zinc-500">{issue.key}</span>
                                <span className="flex-1 text-zinc-300 truncate">{issue.title}</span>
                                <span className="text-zinc-500 text-[10px] capitalize">{issue.status}</span>
                                <button
                                    onClick={() => {
                                        const link = [...deps?.blocks ?? [], ...deps?.blockedBy ?? [], ...deps?.relatesTo ?? [], ...deps?.duplicates ?? []]
                                            .find(l => (l as any).id === issue.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-all"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}
