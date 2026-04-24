"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useSession } from "next-auth/react";
import { Bell, Check, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

export function NotificationCenter() {
    const { data: session } = useSession();
    
    // Polling every 15 seconds
    const { data: unreadCount = 0 } = trpc.pmNotifications.unreadCount.useQuery(
        undefined,
        { enabled: !!session?.user, refetchInterval: 15000 }
    );
    
    const { data: notifications = [], refetch } = trpc.pmNotifications.list.useQuery(
        { limit: 20 },
        { enabled: !!session?.user }
    );

    const markRead = trpc.pmNotifications.markRead.useMutation({
        onSuccess: () => refetch()
    });

    const markAllRead = trpc.pmNotifications.markAllRead.useMutation({
        onSuccess: () => refetch()
    });

    const clearRead = trpc.pmNotifications.clearRead.useMutation({
        onSuccess: () => refetch()
    });

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="relative p-2 rounded-md hover:bg-accent text-foreground transition-colors outline-none focus:ring-1 focus:ring-ring">
                    <Bell size={18} className="text-muted-foreground" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 w-4 h-4 bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold rounded-full border-2 border-background">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[340px]">
                <div className="flex items-center justify-between px-2 pt-2 pb-1">
                    <DropdownMenuLabel className="p-0 font-semibold tracking-tight text-base">Notifications</DropdownMenuLabel>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => markAllRead.mutate()} title="Mark all as read">
                            <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => clearRead.mutate()} title="Clear read">
                            <Trash className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <DropdownMenuSeparator />
                
                <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                            You're all caught up!
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <DropdownMenuItem key={n.id} className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${!n.read ? 'bg-primary/5' : ''}`} onClick={(e) => {
                                e.preventDefault();
                                if (!n.read) markRead.mutate({ id: n.id });
                            }}>
                                <div className="flex w-full justify-between gap-2">
                                    <span className={`text-sm font-medium leading-tight ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {n.title}
                                    </span>
                                    {!n.read && <span className="w-2 h-2 shrink-0 bg-primary rounded-full mt-1" />}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                </span>
                            </DropdownMenuItem>
                        ))
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
