export interface LangFuseTrace {
    id: string;
    name: string;
    timestamp: string;
    userId: string;
    sessionId: string;
    tags: string[];
    status: string;
    latency: number;
    totalTokens: number;
    totalCost: number;
    level: "SUCCESS" | "ERROR" | "WARNING";
    input: Record<string, unknown> | string | null;
    output: Record<string, unknown> | string | null;
    spans: Record<string, unknown>[];
}

export interface LangFusePrompt {
    id: string;
    name: string;
    labels: string[];
    version: number;
    content: string;
    variables: string[];
    createdAt: string;
    updatedAt: string;
}

export interface GitLabMREvent {
    object_kind: string;
    project: { id: number; name: string; web_url: string };
    object_attributes: {
        id: number;
        iid: number;
        title: string;
        state: string;
        source_branch: string;
        target_branch: string;
        url: string;
        merged_at: string;
    };
    user: { name: string; username: string };
}

export interface MergeEvent {
    id: string;
    timestamp: string;
    branch: string;
    prompt: string;
    status: "success" | "conflict" | "failed";
    trigger: string;
}
