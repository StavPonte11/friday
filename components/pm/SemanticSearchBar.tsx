"use client";

import React, { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Search, Loader2, X, ExternalLink } from "lucide-react";
import { PmIssueStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";
import Link from "next/link";

const STATUS_COLOR: Record<PmIssueStatus, string> = {
    BACKLOG: "bg-zinc-400",
    TODO: "bg-slate-400",
    IN_PROGRESS: "bg-blue-500",
    IN_REVIEW: "bg-yellow-500",
    DONE: "bg-green-500",
    CANCELED: "bg-red-400"
};

interface SemanticSearchBarProps {
    projectId?: string;
    className?: string;
}

export function SemanticSearchBar({ projectId, className }: SemanticSearchBarProps) {
    const locale = useLocale();
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Debounce
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(query), 400);
        return () => clearTimeout(t);
    }, [query]);

    const { data, isFetching } = trpc.pmSearch.semanticSearch.useQuery(
        { query: debouncedQuery, projectId, limit: 8 },
        {
            enabled: debouncedQuery.trim().length >= 3,
            staleTime: 30_000
        }
    );

    useEffect(() => {
        setIsOpen(!!debouncedQuery && debouncedQuery.length >= 3);
    }, [debouncedQuery, data]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={containerRef} className={cn("relative w-full max-w-lg", className)}>
            {/* Input */}
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => debouncedQuery.length >= 3 && setIsOpen(true)}
                    placeholder="Search issues semantically..."
                    className="w-full pl-9 pr-8 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-muted-foreground transition-shadow"
                />
                {query && (
                    <button
                        onClick={() => { setQuery(""); setDebouncedQuery(""); setIsOpen(false); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X size={14} />
                    </button>
                )}
                {isFetching && !query.endsWith(debouncedQuery) && (
                    <Loader2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-primary" />
                )}
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full mt-1.5 left-0 right-0 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    {isFetching ? (
                        <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                            <Loader2 size={14} className="animate-spin text-primary" />
                            Searching semantically...
                        </div>
                    ) : !data?.results.length ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground">
                            No matching issues found.
                        </div>
                    ) : (
                        <ul>
                            {data.results.map((result, idx) => (
                                <li key={result.id}>
                                    <Link
                                        href={`/${locale}/pm/issues/${result.id}`}
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group"
                                    >
                                        <div className="flex-shrink-0 mt-1">
                                            <div className={cn("w-2 h-2 rounded-full mt-0.5", STATUS_COLOR[result.status])} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono text-muted-foreground flex-shrink-0">{result.key}</span>
                                                <span className="text-sm font-medium text-foreground truncate">{result.title}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-muted-foreground">{result.project.name}</span>
                                                <span className="text-xs text-muted-foreground">·</span>
                                                <span className="text-xs text-primary/80">
                                                    {Math.round(result.similarity * 100)}% match
                                                </span>
                                            </div>
                                        </div>
                                        <ExternalLink size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                                    </Link>
                                    {idx < data.results.length - 1 && (
                                        <div className="h-px bg-border/50 mx-4" />
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="px-4 py-2 border-t border-border bg-muted/20 flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">Powered by</span>
                        <span className="text-[10px] font-semibold text-primary">F.R.I.D.A.Y Semantic Memory</span>
                    </div>
                </div>
            )}
        </div>
    );
}
