/**
 * In-memory presence store.
 * Tracks which users are currently viewing which issue.
 *
 * NOTE: This is a singleton per Next.js server process.
 * For multi-instance deployments, replace with Redis pub/sub.
 */

export interface PresenceRecord {
    userId: string;
    userName: string;
    userImage?: string;
    connectedAt: number;
}

// Map<issueId, Map<connectionId, PresenceRecord>>
const presenceStore = new Map<string, Map<string, PresenceRecord>>();

// Map<projectId, Set<(payload: string) => void>>  — for board realtime
const projectListeners = new Map<string, Set<(payload: string) => void>>();

// ─── Issue Presence ───────────────────────────────────────────────────────────

export function joinIssue(issueId: string, connectionId: string, record: PresenceRecord): void {
    if (!presenceStore.has(issueId)) {
        presenceStore.set(issueId, new Map());
    }
    presenceStore.get(issueId)!.set(connectionId, record);
}

export function leaveIssue(issueId: string, connectionId: string): void {
    presenceStore.get(issueId)?.delete(connectionId);
    if (presenceStore.get(issueId)?.size === 0) {
        presenceStore.delete(issueId);
    }
}

export function getIssueViewers(issueId: string): PresenceRecord[] {
    return Array.from(presenceStore.get(issueId)?.values() ?? []);
}

// ─── Project Realtime Events ───────────────────────────────────────────────────

export function subscribeProject(projectId: string, listener: (payload: string) => void): () => void {
    if (!projectListeners.has(projectId)) {
        projectListeners.set(projectId, new Set());
    }
    projectListeners.get(projectId)!.add(listener);

    // Return cleanup function
    return () => {
        projectListeners.get(projectId)?.delete(listener);
        if (projectListeners.get(projectId)?.size === 0) {
            projectListeners.delete(projectId);
        }
    };
}

export function broadcastProjectEvent(projectId: string, type: string, payload: Record<string, unknown>): void {
    const event = JSON.stringify({ type, payload, timestamp: Date.now() });
    projectListeners.get(projectId)?.forEach(listener => {
        try { listener(event); } catch {}
    });
}
