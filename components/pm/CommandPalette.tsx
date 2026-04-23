"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";
import { Search, Plus, Zap, LayoutDashboard, BarChart3, Kanban, X, Clock } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommandItem {
    id: string;
    type: "issue" | "action" | "navigation" | "ai";
    label: string;
    description?: string;
    icon: React.ReactNode;
    onSelect: () => void;
}

// ─── CommandPalette ──────────────────────────────────────────────────────────

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const locale = useLocale();

    const nav = useCallback((path: string) => {
        router.push(`/${locale}${path}`);
        setOpen(false);
    }, [router, locale]);

    const { data: session } = useSession();
    const userId = (session?.user as any)?.id;

    // tRPC – global search
    const { data: searchResults } = trpc.pmSearch.global.useQuery(
        { query, limit: 5 },
        { enabled: open && query.trim().length >= 2, staleTime: 2000 }
    );

    // tRPC - recent views
    const { data: recentViews } = trpc.pmSearch.recent.useQuery(
        { userId: userId as string, limit: 5 },
        { enabled: open && query.trim().length < 2 && !!userId, staleTime: 5000 }
    );

    // ── Keyboard shortcut to open ──────────────────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setOpen(prev => !prev);
                setQuery("");
                setSelected(0);
            }
            if (e.key === "Escape") setOpen(false);

            // Single key shortcuts (only if not typing in an input)
            if (!open && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable)) {
                if (e.key.toLowerCase() === "c") {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent("pm:create-issue"));
                }
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open]);

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 50);
    }, [open]);

    // ── Build command list ─────────────────────────────────────────────────
    const staticCommands: CommandItem[] = [
        // Navigation
        {
            id: "nav-board",
            type: "navigation",
            label: "Open Board",
            description: "Kanban board view",
            icon: <Kanban className="w-4 h-4" />,
            onSelect: () => nav("/pm/board"),
        },
        {
            id: "nav-analytics",
            type: "navigation",
            label: "Open Analytics",
            description: "Project analytics & charts",
            icon: <BarChart3 className="w-4 h-4" />,
            onSelect: () => nav("/pm/analytics"),
        },
        {
            id: "nav-dashboard",
            type: "navigation",
            label: "Open Dashboard",
            description: "Team productivity dashboard",
            icon: <LayoutDashboard className="w-4 h-4" />,
            onSelect: () => nav("/pm/dashboard"),
        },
        // Actions
        {
            id: "action-create-issue",
            type: "action",
            label: "Create New Issue",
            description: "Open issue creation dialog",
            icon: <Plus className="w-4 h-4" />,
            onSelect: () => {
                setOpen(false);
                window.dispatchEvent(new CustomEvent("pm:create-issue"));
            },
        },
        // AI actions
        {
            id: "ai-groom",
            type: "ai",
            label: "✨ Groom Backlog",
            description: "AI: detect duplicates & oversized issues",
            icon: <Zap className="w-4 h-4 text-yellow-400" />,
            onSelect: () => {
                setOpen(false);
                window.dispatchEvent(new CustomEvent("pm:ai-groom"));
            },
        },
        {
            id: "ai-report",
            type: "ai",
            label: "✨ Generate Manager Report",
            description: "AI: weekly velocity & workload summary",
            icon: <Zap className="w-4 h-4 text-yellow-400" />,
            onSelect: () => {
                setOpen(false);
                window.dispatchEvent(new CustomEvent("pm:ai-report"));
            },
        },
    ];

    const issueCommands: CommandItem[] = (searchResults?.issues ?? []).map(issue => ({
        id: `issue-${issue.id}`,
        type: "issue",
        label: `${issue.key}: ${issue.title}`,
        description: issue.status,
        icon: <span className="text-xs font-mono text-muted-foreground">{issue.key}</span>,
        onSelect: () => nav(`/pm/issues/${issue.id}`),
    }));

    const projectCommands: CommandItem[] = (searchResults?.projects ?? []).map(project => ({
        id: `project-${project.id}`,
        type: "navigation",
        label: `${project.key}: ${project.name}`,
        description: "Project",
        icon: <span className="text-xs font-mono text-muted-foreground">{project.key}</span>,
        onSelect: () => nav(`/pm/projects/${project.id}`),
    }));

    const recentIssueCommands: CommandItem[] = (recentViews?.issues ?? []).map(issue => ({
        id: `recent-issue-${issue.id}`,
        type: "issue",
        label: `${issue.key}: ${issue.title}`,
        description: "Recent Issue",
        icon: <Clock className="w-3.5 h-3.5 text-muted-foreground" />,
        onSelect: () => nav(`/pm/issues/${issue.id}`),
    }));

    const recentProjectCommands: CommandItem[] = (recentViews?.projects ?? []).map(project => ({
        id: `recent-project-${project.id}`,
        type: "navigation",
        label: `${project.key}: ${project.name}`,
        description: "Recent Project",
        icon: <Clock className="w-3.5 h-3.5 text-muted-foreground" />,
        onSelect: () => nav(`/pm/projects/${project.id}`),
    }));

    const q = query.toLowerCase();
    
    // Determine what to show
    let filtered: CommandItem[] = [];
    if (q.length < 2) {
        filtered = [
            ...recentIssueCommands,
            ...recentProjectCommands,
            ...staticCommands
        ];
    } else {
        filtered = [
            ...issueCommands,
            ...projectCommands,
            ...staticCommands.filter(c =>
                c.label.toLowerCase().includes(q) ||
                (c.description ?? "").toLowerCase().includes(q)
            ),
        ];
    }

    // ── Keyboard navigation inside palette ────────────────────────────────
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelected(s => Math.min(s + 1, filtered.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelected(s => Math.max(s - 1, 0));
        } else if (e.key === "Enter") {
            filtered[selected]?.onSelect();
        }
    }, [filtered, selected]);

    // ── Badge colour per type ─────────────────────────────────────────────
    const typeBadge: Record<CommandItem["type"], string> = {
        issue:      "bg-blue-500/10 text-blue-400",
        action:     "bg-green-500/10 text-green-400",
        navigation: "bg-purple-500/10 text-purple-400",
        ai:         "bg-yellow-500/10 text-yellow-300",
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
        >
            <div
                className="w-full max-w-xl bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
                onKeyDown={handleKeyDown}
            >
                {/* Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => { setQuery(e.target.value); setSelected(0); }}
                        placeholder="Search issues, actions, AI tools…"
                        className="flex-1 bg-transparent text-sm text-white placeholder:text-muted-foreground outline-none"
                    />
                    {query && (
                        <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-white">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <kbd className="text-[10px] text-muted-foreground border border-white/10 rounded px-1.5 py-0.5 font-mono shrink-0">
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <ul className="max-h-[360px] overflow-y-auto py-2">
                    {filtered.length === 0 && (
                        <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No results for &ldquo;{query}&rdquo;
                        </li>
                    )}
                    {filtered.map((item, idx) => (
                        <li
                            key={item.id}
                            onClick={item.onSelect}
                            onMouseEnter={() => setSelected(idx)}
                            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                                idx === selected ? "bg-white/8" : "hover:bg-white/5"
                            }`}
                        >
                            <span className={`w-7 h-7 flex items-center justify-center rounded-lg shrink-0 ${typeBadge[item.type]}`}>
                                {item.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm text-white truncate">{item.label}</p>
                                {item.description && (
                                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                                )}
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${typeBadge[item.type]}`}>
                                {item.type}
                            </span>
                        </li>
                    ))}
                </ul>

                {/* Footer hint */}
                <div className="border-t border-white/10 px-4 py-2 flex items-center gap-4 text-[11px] text-muted-foreground">
                    <span><kbd className="font-mono">↑↓</kbd> navigate</span>
                    <span><kbd className="font-mono">↵</kbd> select</span>
                    <span><kbd className="font-mono">Ctrl+K</kbd> toggle</span>
                </div>
            </div>
        </div>
    );
}

/**
 * Hook to programmatically open the command palette.
 */
export function useCommandPalette() {
    const open = useCallback(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
    }, []);
    return { open };
}
