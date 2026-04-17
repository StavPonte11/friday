"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import {
    Search, Hash, LayoutDashboard, FolderKanban,
    GitBranch, Calendar, BarChart3, Bot, X, ArrowRight, Loader2, BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandItem {
    id: string;
    label: string;
    description?: string;
    icon: React.ReactNode;
    action: () => void;
    category: "navigation" | "issue" | "ai";
}

interface CommandPaletteProps {
    projectId?: string;
}

export function CommandPalette({ projectId }: CommandPaletteProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const locale = useLocale();

    // Semantic search while query is long enough
    const { data: searchResults, isFetching: isSearching } = trpc.pmSearch.semanticSearch.useQuery(
        { query, projectId, limit: 5 },
        { enabled: query.trim().length >= 3, staleTime: 30_000 }
    );

    // Open on CMD+K / Ctrl+K
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === "Escape") setIsOpen(false);
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setQuery("");
            setSelected(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const nav = useCallback((path: string) => {
        router.push(`/${locale}${path}`);
        setIsOpen(false);
    }, [router, locale]);

    // Static navigation commands
    const navCommands: CommandItem[] = [
        { id: "board", label: "Open Board", description: "Kanban sprint board", icon: <LayoutDashboard size={15} />, action: () => nav("/pm/board"), category: "navigation" },
        { id: "issues", label: "All Issues", description: "Browse backlog", icon: <Hash size={15} />, action: () => nav("/pm/issues"), category: "navigation" },
        { id: "projects", label: "Projects", description: "Switch project", icon: <FolderKanban size={15} />, action: () => nav("/pm/projects"), category: "navigation" },
        { id: "gantt", label: "Gantt Chart", description: "Timeline view", icon: <GitBranch size={15} />, action: () => projectId ? nav(`/pm/projects/${projectId}/gantt`) : nav("/pm/projects"), category: "navigation" },
        { id: "calendar", label: "Calendar View", description: "Due date overview", icon: <Calendar size={15} />, action: () => projectId ? nav(`/pm/projects/${projectId}/calendar`) : nav("/pm/projects"), category: "navigation" },
        { id: "analytics", label: "Analytics", description: "Sprint health & AI insights", icon: <BarChart3 size={15} />, action: () => nav("/pm/analytics"), category: "navigation" },
        { id: "graph", label: "Execution Graph", description: "Dependency visualization", icon: <GitBranch size={15} />, action: () => projectId ? nav(`/pm/projects/${projectId}/graph`) : nav("/pm/projects"), category: "navigation" },
        { id: "agent", label: "Ask FRIDAY Agent", description: "AI-powered project assistance", icon: <Bot size={15} />, action: () => { setIsOpen(false); }, category: "ai" },
        { id: "docs", label: "Documentation", description: "Platform reference and guides", icon: <BookOpen size={15} />, action: () => nav("/docs/overview"), category: "navigation" },
        { id: "docs-pm", label: "Docs: FRIDAY PM", description: "Issue tracking guides", icon: <BookOpen size={15} />, action: () => nav("/docs/pm"), category: "navigation" },
        { id: "docs-agents", label: "Docs: Agents & MCP", description: "Agent integration reference", icon: <BookOpen size={15} />, action: () => nav("/docs/agents"), category: "navigation" },
    ];

    // Issue results from semantic search
    const issueCommands: CommandItem[] = (searchResults?.results ?? []).map(r => ({
        id: r.id,
        label: `${r.key} — ${r.title}`,
        description: `${r.project.name} · ${Math.round(r.similarity * 100)}% match`,
        icon: <Hash size={15} />,
        action: () => nav(`/pm/issues/${r.id}`),
        category: "issue" as const
    }));

    // Filter nav commands by query
    const filtered = query.length < 3
        ? navCommands
        : navCommands.filter(c =>
            c.label.toLowerCase().includes(query.toLowerCase()) ||
            c.description?.toLowerCase().includes(query.toLowerCase())
        );

    const allItems: CommandItem[] = query.length >= 3
        ? [...issueCommands, ...filtered]
        : filtered;

    // Keyboard navigation
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelected(s => Math.min(s + 1, allItems.length - 1));
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelected(s => Math.max(s - 1, 0));
            }
            if (e.key === "Enter" && allItems[selected]) {
                allItems[selected].action();
            }
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [isOpen, allItems, selected]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm animate-in fade-in duration-100"
            onClick={e => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
            <div className="w-full max-w-xl bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-top-2 duration-150">
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                    {isSearching
                        ? <Loader2 size={16} className="text-primary animate-spin flex-shrink-0" />
                        : <Search size={16} className="text-muted-foreground flex-shrink-0" />
                    }
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => { setQuery(e.target.value); setSelected(0); }}
                        placeholder="Search issues or type a command..."
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
                    />
                    {query && (
                        <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground transition-colors">
                            <X size={14} />
                        </button>
                    )}
                    <kbd className="hidden md:flex text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">ESC</kbd>
                </div>

                {/* Results */}
                <div className="max-h-[360px] overflow-y-auto py-1.5">
                    {allItems.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-muted-foreground">No results found.</p>
                    ) : (
                        <>
                            {query.length >= 3 && issueCommands.length > 0 && (
                                <p className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Issues</p>
                            )}
                            {allItems.map((item, i) => {
                                const isNavAfterIssues = item.category === "navigation" && i === issueCommands.length && query.length >= 3;
                                return (
                                    <React.Fragment key={item.id}>
                                        {isNavAfterIssues && (
                                            <p className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-t border-border mt-1 pt-2">Navigation</p>
                                        )}
                                        <button
                                            onClick={item.action}
                                            onMouseEnter={() => setSelected(i)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                                                selected === i ? "bg-primary text-primary-foreground" : "hover:bg-muted/50 text-foreground"
                                            )}
                                        >
                                            <div className={cn("flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center",
                                                selected === i ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                                            )}>
                                                {item.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{item.label}</p>
                                                {item.description && (
                                                    <p className={cn("text-xs truncate", selected === i ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                                        {item.description}
                                                    </p>
                                                )}
                                            </div>
                                            <ArrowRight size={13} className={cn("flex-shrink-0 opacity-0 transition-opacity", selected === i && "opacity-100")} />
                                        </button>
                                    </React.Fragment>
                                );
                            })}
                        </>
                    )}
                </div>

                {/* Footer hints */}
                <div className="flex items-center gap-4 px-4 py-2 border-t border-border bg-muted/20">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <kbd className="bg-muted px-1 rounded border border-border">↑↓</kbd> navigate
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <kbd className="bg-muted px-1 rounded border border-border">↵</kbd> select
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
                        <kbd className="bg-muted px-1 rounded border border-border">⌘K</kbd> toggle
                    </span>
                </div>
            </div>
        </div>
    );
}
