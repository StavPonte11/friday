"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * useRealtimeBoard
 *
 * Connects to the SSE /api/events endpoint and invalidates TanStack Query caches
 * on matching events so the board automatically re-fetches without a page reload.
 *
 * Usage:
 *   useRealtimeBoard({ projectId });
 */
export function useRealtimeBoard({ projectId }: { projectId: string }) {
    const qc = useQueryClient();
    const esRef = useRef<EventSource | null>(null);

    const invalidate = useCallback(
        (keys: string[]) => {
            keys.forEach(key => {
                qc.invalidateQueries({ queryKey: [key] });
            });
        },
        [qc],
    );

    useEffect(() => {
        if (!projectId) return;

        const es = new EventSource(`/api/events?projectId=${projectId}`);
        esRef.current = es;

        es.onmessage = (event) => {
            try {
                const { type } = JSON.parse(event.data) as { type: string; payload: unknown };

                // Invalidate the relevant TanStack Query keys based on event type
                if (type.startsWith("issue.")) {
                    invalidate(["pmIssues.listByProject", "pmIssues.listBySprint"]);
                }
                if (type.startsWith("comment.")) {
                    invalidate(["pmComments.list"]);
                }
                if (type.startsWith("sprint.")) {
                    invalidate(["pmSprints.list"]);
                }
            } catch {
                // Ignore malformed events
            }
        };

        es.onerror = () => {
            // Auto-reconnect: browser handles this natively for EventSource
        };

        return () => {
            es.close();
        };
    }, [projectId, invalidate]);
}
