"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, X, Check, CheckCheck, Trash2, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";

const TYPE_ICONS: Record<string, string> = {
    issue_assigned: "👤",
    comment_added: "💬",
    mentioned: "🔔",
    issue_updated: "✏️",
    sprint_started: "🚀",
    sprint_completed: "✅",
    issue_linked: "🔗",
};

export function NotificationBell({ workspaceSlug }: { workspaceSlug: string }) {
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const { data: count, refetch: refetchCount } = trpc.pmNotifications.unreadCount.useQuery(
        undefined,
        { refetchInterval: 30_000 }
    );
    const { data: notifications, refetch: refetchList } = trpc.pmNotifications.list.useQuery(
        { limit: 20 },
        { enabled: open }
    );

    const markRead = trpc.pmNotifications.markRead.useMutation({
        onSuccess: () => { refetchCount(); refetchList(); }
    });
    const markAllRead = trpc.pmNotifications.markAllRead.useMutation({
        onSuccess: () => { refetchCount(); refetchList(); }
    });
    const clearRead = trpc.pmNotifications.clearRead.useMutation({
        onSuccess: () => refetchList()
    });

    // Close panel on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        if (open) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    function handleNotificationClick(n: any) {
        if (!n.readAt) markRead.mutate({ id: n.id });
        const payload = n.payload as any;
        if (payload?.issueId && payload?.projectId) {
            setOpen(false);
            router.push(`/en/${workspaceSlug}/pm/issues/${payload.issueId}`);
        }
    }

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell button */}
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                aria-label="Notifications"
            >
                <Bell className="w-5 h-5" />
                {(count ?? 0) > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center
                                     rounded-full bg-blue-500 text-[10px] font-bold text-white px-0.5
                                     animate-in zoom-in-50 duration-200">
                        {count! > 99 ? "99+" : count}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div className="absolute right-0 top-full mt-2 w-96 max-h-[480px] flex flex-col
                                rounded-xl bg-zinc-900 border border-zinc-700/80 shadow-2xl shadow-black/50
                                animate-in slide-in-from-top-2 duration-150 z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700/60">
                        <h3 className="text-sm font-semibold text-zinc-100">Notifications</h3>
                        <div className="flex items-center gap-1">
                            {(count ?? 0) > 0 && (
                                <button
                                    onClick={() => markAllRead.mutate()}
                                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded hover:bg-zinc-700/50 transition-colors"
                                    title="Mark all read"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" /> All read
                                </button>
                            )}
                            <button
                                onClick={() => clearRead.mutate()}
                                className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50 transition-colors"
                                title="Clear read notifications"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setOpen(false)}
                                className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="overflow-y-auto flex-1 divide-y divide-zinc-700/40">
                        {!notifications || notifications.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-12 text-zinc-500">
                                <Bell className="w-8 h-8 opacity-30" />
                                <p className="text-sm">You're all caught up!</p>
                            </div>
                        ) : (
                            notifications.map((n) => {
                                const payload = n.payload as any;
                                const isUnread = !n.readAt;

                                return (
                                    <div
                                        key={n.id}
                                        onClick={() => handleNotificationClick(n)}
                                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors
                                            ${isUnread
                                                ? "bg-blue-500/5 hover:bg-blue-500/10"
                                                : "hover:bg-zinc-800/50"
                                            }`}
                                    >
                                        <span className="text-lg mt-0.5 shrink-0">
                                            {TYPE_ICONS[n.type] ?? "🔔"}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm truncate ${isUnread ? "text-zinc-100 font-medium" : "text-zinc-300"}`}>
                                                {n.title}
                                            </p>
                                            {payload?.issueKey && (
                                                <p className="text-xs text-zinc-500 mt-0.5 font-mono">{payload.issueKey}</p>
                                            )}
                                            <p className="text-xs text-zinc-600 mt-0.5">
                                                {new Date(n.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {isUnread && (
                                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1" />
                                            )}
                                            {payload?.issueId && (
                                                <ExternalLink className="w-3.5 h-3.5 text-zinc-600 hover:text-zinc-400 transition-colors" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
