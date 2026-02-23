import { useQuery } from "@tanstack/react-query";
import { usePrompts } from "@/hooks/use-observability";

export function useMergeHistory() {
    return useQuery({
        queryKey: ["merge-history"],
        queryFn: async () => {
            // Placeholder data reflecting GitLab merges
            return [
                { id: 1, timestamp: new Date().toISOString(), branch: "feat/new-auth", prompt: "login-prompt", status: "success", trigger: "GitLab MR #12" },
                { id: 2, timestamp: new Date(Date.now() - 86400000).toISOString(), branch: "feat/checkout-flow", prompt: "checkout-sys-prompt", status: "conflict", trigger: "GitLab MR #11" }
            ];
        },
    });
}

export function useConflicts() {
    return useQuery({
        queryKey: ["conflicts"],
        queryFn: async () => {
            // Placeholder data
            return [
                { id: 2, promptName: "checkout-sys-prompt", prodVersion: "v4", featVersion: "v2-feat" }
            ];
        },
    });
}
