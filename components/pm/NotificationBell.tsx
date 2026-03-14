"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useSession } from "next-auth/react";
import { Bell, Check, CheckCheck, MessageSquare, UserCheck, GitCommit, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const notificationIcon: Record<string, React.ReactNode> = {
    issue_assigned: <UserCheck className="w-4 h-4 text-blue-500" />,
    issue_updated: <Zap className="w-4 h-4 text-amber-500" />,
    comment_added: <MessageSquare className="w-4 h-4 text-green-500" />,
    mentioned: <MessageSquare className="w-4 h-4 text-purple-500" />,
    sprint_started: <GitCommit className="w-4 h-4 text-teal-500" />,
    sprint_completed: <GitCommit className="w-4 h-4 text-emerald-500" />,
};

export function NotificationBell() {
    const { data: session } = useSession();
    const userId = (session?.user as any)?.id ?? "";

    const [open, setOpen] = useState(false);

    const { data: unreadCount, refetch: refetchCount } = trpc.pmNotifications.unreadCount.useQuery(
        { userId },
        { enabled: !!userId, refetchInterval: 30000 }
    );

    const { data: notifications, isLoading, refetch } = trpc.pmNotifications.list.useQuery(
        { userId, limit: 20 },
        { enabled: !!userId && open }
    );

    const markRead = trpc.pmNotifications.markRead.useMutation({ onSuccess: () => { refetch(); refetchCount(); } });
    const markAllRead = trpc.pmNotifications.markAllRead.useMutation({ onSuccess: () => { refetch(); refetchCount(); } });

    if (!userId) return null;

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Notifications"
            >
                <Bell className="w-5 h-5 text-muted-foreground" />
                {(unreadCount ?? 0) > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount! > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

                    {/* Popover */}
                    <div className="absolute right-0 top-full mt-2 w-96 max-h-[460px] bg-card border border-border rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                            <div className="flex items-center gap-2">
                                <Bell className="w-4 h-4 text-muted-foreground" />
                                <span className="font-semibold text-sm">Notifications</span>
                                {(unreadCount ?? 0) > 0 && (
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => markAllRead.mutate({ userId })}
                                disabled={!unreadCount || markAllRead.isPending}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary disabled:opacity-50 transition-colors"
                            >
                                <CheckCheck className="w-3 h-3" /> Mark all read
                            </button>
                        </div>

                        {/* Notification list */}
                        <div className="flex-1 overflow-y-auto">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Loading...</div>
                            ) : !notifications?.length ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                                    <Bell className="w-8 h-8 opacity-30" />
                                    <span className="text-sm">No notifications yet</span>
                                </div>
                            ) : (
                                notifications.map(notif => (
                                    <div
                                        key={notif.id}
                                        className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer border-b border-border/50 last:border-0 ${!notif.read ? "bg-primary/5" : ""}`}
                                        onClick={() => !notif.read && markRead.mutate({ id: notif.id, userId })}
                                    >
                                        <div className="flex-shrink-0 mt-0.5">
                                            {notificationIcon[notif.type] ?? <Bell className="w-4 h-4 text-muted-foreground" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm leading-snug ${!notif.read ? "font-medium" : ""}`}>
                                                {notif.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                        {!notif.read && (
                                            <div className="flex-shrink-0">
                                                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
