"use client";

import React, { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { PmIssueType } from "@prisma/client";
import { 
    ChevronRight, ChevronDown, Layers2, Zap, BookOpen, 
    Bug, TestTube, Type, CheckSquare, Plus, Loader2, Search
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Type configuration ───────────────────────────────────────────────────────

const TYPE_CONFIG: Record<PmIssueType, { icon: React.ElementType; color: string; label: string; bg: string }> = {
    INITIATIVE: { icon: Layers2, color: "text-violet-500", bg: "bg-violet-500/10", label: "Initiative" },
    EPIC:       { icon: Zap,     color: "text-orange-500", bg: "bg-orange-500/10", label: "Epic" },
    FEATURE:    { icon: BookOpen, color: "text-blue-500",  bg: "bg-blue-500/10",   label: "Feature" },
    STORY:      { icon: BookOpen, color: "text-green-500", bg: "bg-green-500/10",  label: "Story" },
    TASK:       { icon: CheckSquare, color: "text-sky-500", bg: "bg-sky-500/10",   label: "Task" },
    SUBTASK:    { icon: Type,    color: "text-slate-400", bg: "bg-slate-500/10",   label: "Subtask" },
    BUG:        { icon: Bug,     color: "text-red-500",   bg: "bg-red-500/10",     label: "Bug" },
    TEST:       { icon: TestTube, color: "text-teal-500", bg: "bg-teal-500/10",    label: "Test" },
};

const STATUS_COLORS: Record<string, string> = {
    DONE: "bg-green-500",
    IN_PROGRESS: "bg-blue-500",
    IN_REVIEW: "bg-purple-500",
    BLOCKED: "bg-red-500",
    TODO: "bg-muted",
    BACKLOG: "bg-muted-foreground/40",
};

// ─── TypeBadge ────────────────────────────────────────────────────────────────

export function IssueTypeBadge({ type, size = "sm" }: { type: PmIssueType; size?: "xs" | "sm" | "md" }) {
    const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.TASK;
    const Icon = cfg.icon;
    const sizes = { xs: "text-[10px] px-1 py-0.5", sm: "text-xs px-1.5 py-0.5", md: "text-sm px-2 py-1" };
    const iconSizes = { xs: 10, sm: 12, md: 14 };

    return (
        <span className={cn("inline-flex items-center gap-1 rounded font-medium", cfg.bg, cfg.color, sizes[size])}>
            <Icon size={iconSizes[size]} />
            {cfg.label}
        </span>
    );
}

// ─── Tree node ────────────────────────────────────────────────────────────────

type TreeNode = {
    id: string;
    key: string;
    title: string;
    type: PmIssueType;
    status: string;
    priority: string;
    assigneeId: string | null;
    children: TreeNode[];
    depth: number;
    childCount: number;
};

interface TreeNodeProps {
    node: TreeNode;
    onSelect?: (id: string) => void;
    selectedId?: string;
}

function TreeNodeRow({ node, onSelect, selectedId }: TreeNodeProps) {
    const [expanded, setExpanded] = useState(node.depth < 2);
    const cfg = TYPE_CONFIG[node.type] ?? TYPE_CONFIG.TASK;
    const Icon = cfg.icon;
    const hasChildren = node.children.length > 0;

    return (
        <div>
            <div
                className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer group transition-colors",
                    "hover:bg-muted/60",
                    selectedId === node.id && "bg-primary/10 ring-1 ring-primary/30"
                )}
                style={{ paddingLeft: `${(node.depth * 20) + 12}px` }}
                onClick={() => onSelect?.(node.id)}
            >
                {/* Expand/collapse toggle */}
                <button
                    className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
                    onClick={e => { e.stopPropagation(); setExpanded(p => !p); }}
                >
                    {hasChildren
                        ? expanded
                            ? <ChevronDown size={12} />
                            : <ChevronRight size={12} />
                        : <span className="w-3" />
                    }
                </button>

                {/* Type icon */}
                <span className={cn("flex-shrink-0 w-5 h-5 rounded flex items-center justify-center", cfg.bg)}>
                    <Icon size={11} className={cfg.color} />
                </span>

                {/* Key */}
                <span className="text-[11px] font-mono text-muted-foreground flex-shrink-0">{node.key}</span>

                {/* Title */}
                <span className="text-sm font-medium truncate flex-1">{node.title}</span>

                {/* Status dot */}
                <span className={cn("w-2 h-2 rounded-full flex-shrink-0", STATUS_COLORS[node.status] ?? "bg-muted")} />

                {/* Child count badge */}
                {hasChildren && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 rounded-full flex-shrink-0">
                        {node.childCount}
                    </span>
                )}
            </div>

            {/* Recursive children */}
            {expanded && hasChildren && (
                <div className="relative">
                    <div
                        className="absolute left-0 top-0 bottom-0 border-l-2 border-border/40"
                        style={{ left: `${(node.depth + 1) * 20 + 12 + 6}px` }}
                    />
                    {node.children.map(child => (
                        <TreeNodeRow key={child.id} node={child} onSelect={onSelect} selectedId={selectedId} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main tree component ──────────────────────────────────────────────────────

interface IssueHierarchyTreeProps {
    projectId: string;
    onSelectIssue?: (id: string) => void;
    selectedIssueId?: string;
    className?: string;
}

export function IssueHierarchyTree({ projectId, onSelectIssue, selectedIssueId, className }: IssueHierarchyTreeProps) {
    const [search, setSearch] = useState("");
    const { data: tree, isLoading } = trpc.pmHierarchy.tree.useQuery({ projectId });
    const { data: stats } = trpc.pmHierarchy.stats.useQuery({ projectId });

    function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
        if (!query) return nodes;
        return nodes.reduce<TreeNode[]>((acc, node) => {
            const filteredChildren = filterTree(node.children, query);
            const matches =
                node.title.toLowerCase().includes(query.toLowerCase()) ||
                node.key.toLowerCase().includes(query.toLowerCase());
            if (matches || filteredChildren.length > 0) {
                acc.push({ ...node, children: filteredChildren });
            }
            return acc;
        }, []);
    }

    const filtered = filterTree((tree ?? []) as TreeNode[], search);

    return (
        <div className={cn("flex flex-col gap-3", className)}>
            {/* Stats row */}
            {stats && (
                <div className="flex flex-wrap gap-2">
                    {stats.map(s => {
                        const cfg = TYPE_CONFIG[s.type as PmIssueType];
                        if (!cfg) return null;
                        const Icon = cfg.icon;
                        return (
                            <div key={s.type} className={cn("flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium", cfg.bg, cfg.color)}>
                                <Icon size={12} /> {s.count} {cfg.label}{s.count !== 1 ? "s" : ""}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Filter hierarchy..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/40 border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary"
                />
            </div>

            {/* Tree */}
            <div className="min-h-[200px]">
                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-muted-foreground" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-10">
                        {search ? "No matches found" : "No issues yet. Create an Epic to get started."}
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {filtered.map(node => (
                            <TreeNodeRow
                                key={node.id}
                                node={node}
                                onSelect={onSelectIssue}
                                selectedId={selectedIssueId}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
