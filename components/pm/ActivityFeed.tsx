"use client";

import React from "react";
import { trpc } from "@/lib/trpc/client";
import { LoadingSpinner } from "@/components/ui/loading-state";
import { GitBranch, MessageSquare, Circle, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type FeedItemType = "audit" | "status_change" | "comment";

const ICON_MAP: Record<FeedItemType, React.ReactNode> = {
    status_change: <GitBranch size={14} className="text-blue-500" />,
    comment: <MessageSquare size={14} className="text-purple-500" />,
    audit: <Circle size={14} className="text-slate-400" />
};

interface ActivityFeedProps {
    projectId: string;
    className?: string;
}

export function ActivityFeed({ projectId, className }: ActivityFeedProps) {
    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
        trpc.activityFeed.getProjectFeed.useInfiniteQuery(
            { projectId, limit: 20 },
            {
                getNextPageParam: (lastPage) => lastPage.nextCursor,
                enabled: !!projectId
            }
        );

    if (isLoading) {
        return (
            <div className={cn("flex items-center justify-center py-8", className)}>
                <LoadingSpinner />
            </div>
        );
    }

    const allItems = data?.pages.flatMap(p => p.feed) ?? [];

    if (allItems.length === 0) {
        return (
            <div className={cn("py-8 text-center text-sm text-muted-foreground", className)}>
                No activity yet. Start working on issues to see the feed.
            </div>
        );
    }

    return (
        <div className={cn("space-y-0", className)}>
            {allItems.map((item, index) => (
                <div key={item.id} className="flex gap-3 group">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                            {ICON_MAP[item.type as FeedItemType] ?? ICON_MAP.audit}
                        </div>
                        {index < allItems.length - 1 && (
                            <div className="w-px flex-1 bg-border my-1 min-h-[16px]" />
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4 pt-0.5 min-w-0">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                            {item.actor ? (
                                <span className="font-medium text-sm text-foreground">{item.actor.name ?? "System"}</span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                    <User size={11} />
                                    System
                                </span>
                            )}
                            <span className="text-sm text-muted-foreground leading-snug">
                                {item.description}
                            </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground/60 mt-1">
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                        </p>
                    </div>
                </div>
            ))}

            {hasNextPage && (
                <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="w-full text-xs text-primary hover:text-primary/80 py-2 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                    {isFetchingNextPage ? (
                        <>
                            <LoadingSpinner className="w-3 h-3" />
                            Loading more...
                        </>
                    ) : "Load more activity"}
                </button>
            )}
        </div>
    );
}
