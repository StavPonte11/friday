"use client";

import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import { History, LayoutDashboard } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GlobalActivityFeedProps {
    projectId: string;
}

export function GlobalActivityFeed({ projectId }: GlobalActivityFeedProps) {
    const { data: activities, isLoading } = trpc.pmActivity.list.useQuery({ projectId });

    if (isLoading) {
        return (
            <div className="space-y-4 p-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex flex-col gap-2 animate-pulse pb-4 last:pb-0">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted/50 rounded w-1/4"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (!activities || activities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm text-center">
                <History className="w-8 h-8 mb-2 opacity-20" />
                No recent activity recorded for this project.
            </div>
        );
    }

    return (
        <ScrollArea className="h-full">
            <div className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                {activities.map((activity, index) => (
                    <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group py-3">
                        {/* Icon */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-background bg-muted text-muted-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            {activity.user?.image ? (
                                <img src={activity.user.image} className="w-full h-full rounded-full object-cover" alt="" title={activity.user.name || "User"} />
                            ) : (
                                <div className="text-xs font-bold">{activity.user?.name?.[0] || activity.user?.email[0] || '?'}</div>
                            )}
                        </div>
                        {/* Card */}
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-xl border border-border bg-card shadow-sm">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">{activity.user?.name || "Someone"}</span>
                                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                                </span>
                            </div>
                            <div className="text-xs text-muted-foreground leading-relaxed mt-1">
                                {activity.action.replace("updated", "updated the")} <span className="font-medium text-foreground">{activity.issue.key}</span>
                                {activity.details ? (
                                    <div className="mt-2 p-2 bg-muted/30 border border-border/50 rounded text-[11px] font-mono whitespace-pre-wrap truncate hidden">
                                        {/* Optional parsed JSON diff display */}
                                        {JSON.stringify(activity.details)}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}
