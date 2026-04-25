"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc/client";

function getWorkspaceCookie(): string | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(/(?:^|;\s*)friday_workspace_id=([^;]+)/);
    return match ? match[1] : null;
}

export function useWorkspace() {
    const { data: workspaces = [], isLoading } = trpc.workspaces.list.useQuery();

    const workspace = useMemo(() => {
        const cookieId = getWorkspaceCookie();
        if (cookieId) {
            const found = workspaces.find((w) => w.id === cookieId);
            if (found) return found;
        }
        return workspaces[0] ?? null;
    }, [workspaces]);

    return { workspace, workspaces, isLoading };
}
