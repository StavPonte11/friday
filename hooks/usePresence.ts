"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export interface Viewer {
    userId: string;
    userName: string;
    userImage?: string;
    connectedAt: number;
}

/**
 * Track real-time presence for an issue — who else is viewing it right now.
 */
export function usePresence(issueId: string | null | undefined) {
    const { data: session } = useSession();
    const [viewers, setViewers] = useState<Viewer[]>([]);

    useEffect(() => {
        if (!issueId || !session?.user) return;

        const user = session.user as any;
        const params = new URLSearchParams({
            issueId,
            userId: user.id ?? "unknown",
            userName: user.name ?? "Unknown",
            ...(user.image ? { userImage: user.image } : {}),
        });

        const es = new EventSource(`/api/pm/presence?${params.toString()}`);

        es.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data) as Viewer[];
                // Exclude self from the displayed list
                setViewers(data.filter(v => v.userId !== user.id));
            } catch {}
        };

        return () => {
            es.close();
        };
    }, [issueId, session]);

    return { viewers };
}
