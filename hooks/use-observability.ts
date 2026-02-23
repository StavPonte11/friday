import { useQuery } from "@tanstack/react-query";

type ApiResponse<T> = {
    data: T | null;
    error: string | null;
    meta?: {
        page?: number;
        total?: number;
        took_ms?: number;
    };
};

export function useTraces(page: number = 1) {
    return useQuery({
        queryKey: ["traces", page],
        queryFn: async (): Promise<ApiResponse<any>> => {
            const res = await fetch(`/api/traces?page=${page}`);
            if (!res.ok) throw new Error("Failed to fetch traces");
            return res.json();
        },
    });
}

export function usePrompts(page: number = 1) {
    return useQuery({
        queryKey: ["prompts", page],
        queryFn: async (): Promise<ApiResponse<any>> => {
            const res = await fetch(`/api/prompts?page=${page}`);
            if (!res.ok) throw new Error("Failed to fetch prompts");
            return res.json();
        },
    });
}

export function useMetrics() {
    // Placeholder metric hook simulating a metrics endpoint/logic
    return useQuery({
        queryKey: ["metrics"],
        queryFn: async () => {
            // TODO: Connect to real Langfuse metrics API if exposed, or aggregate from traces.
            return {
                totalTraces: 12450,
                averageLatency: 1.2,
                totalTokens: 5400000,
                errorRate: 0.8,
            };
        },
    });
}
