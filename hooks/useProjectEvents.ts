"use client";

import { useEffect, useRef, useState } from "react";

export interface ProjectEvent {
    type: string;
    payload: Record<string, unknown>;
    timestamp: number;
}

/**
 * Subscribe to real-time project board events via SSE.
 * Returns the last received event.
 */
export function useProjectEvents(projectId: string | null | undefined) {
    const [lastEvent, setLastEvent] = useState<ProjectEvent | null>(null);
    const esRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (!projectId) return;

        const es = new EventSource(`/api/pm/events?projectId=${projectId}`);
        esRef.current = es;

        es.onmessage = (e) => {
            try {
                const event = JSON.parse(e.data) as ProjectEvent;
                if (event.type !== "connected") {
                    setLastEvent(event);
                }
            } catch {}
        };

        es.onerror = () => {
            // SSE will auto-reconnect on error
        };

        return () => {
            es.close();
            esRef.current = null;
        };
    }, [projectId]);

    return { lastEvent };
}
