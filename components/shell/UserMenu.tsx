"use client";

import React from "react";
import { useSession, signOut } from "next-auth/react";
import { User, LogOut, Settings } from "lucide-react";

export function UserMenu({ isOpen }: { isOpen: boolean }) {
    const { data: session } = useSession();

    return (
        <div className="mt-auto flex flex-col gap-1 w-full relative">
            <button className="flex items-center gap-2 p-2 rounded-md hover:bg-accent text-sm text-foreground">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-primary" />
                </div>
                {isOpen && (
                    <div className="flex flex-col items-start truncate overflow-hidden">
                        <span className="truncate w-full font-medium">{session?.user?.name || "Admin User"}</span>
                        <span className="truncate w-full text-xs text-muted-foreground">{session?.user?.email || "admin@friday.local"}</span>
                    </div>
                )}
            </button>
            {isOpen && (
                <div className="flex border-t border-border mt-1 pt-1 gap-1">
                    <button className="flex-1 flex justify-center p-2 rounded-md hover:bg-accent text-muted-foreground">
                        <Settings size={16} />
                    </button>
                    <button
                        onClick={() => signOut()}
                        className="flex-1 flex justify-center p-2 rounded-md hover:bg-destructive/10 text-destructive"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
