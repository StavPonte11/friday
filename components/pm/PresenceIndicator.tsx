"use client";

import { useEffect, useState } from "react";
import io from "socket.io-client";

interface Viewer {
    userId: string;
    name: string;
    image: string | null;
    status: "online" | "idle";
}

export function PresenceIndicator({ room }: { room: string }) {
    const [viewers, setViewers] = useState<Viewer[]>([]);

    useEffect(() => {
        // Socket.io feature disabled for now as custom server is not configured natively.
        // Prevents endless 404 polling loops.
        // TODO: Implement Supabase Realtime or custom Socket server.
    }, [room]);

    if (viewers.length <= 1) return null;

    return (
        <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
                {viewers.filter((v, idx) => idx < 3).map(v => (
                    <div key={v.userId} title={`${v.name} is here`} className="relative w-8 h-8 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-xs font-medium">
                        {v.name.charAt(0)}
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${v.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                    </div>
                ))}
            </div>
            {viewers.length > 3 && (
                <span className="text-xs text-muted-foreground">+{viewers.length - 3}</span>
            )}
        </div>
    );
}
