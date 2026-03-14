import { z } from "zod";

// ─── GitLab API Response Schemas ─────────────────────────────────────────────

const GitLabIssueSchema = z.object({
    id: z.number(),
    iid: z.number(),
    project_id: z.number(),
    title: z.string(),
    description: z.string().nullable(),
    state: z.enum(["opened", "closed"]),
    web_url: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    assignees: z.array(z.object({ username: z.string(), name: z.string() })).optional().default([]),
    labels: z.array(z.string()).optional().default([]),
});

export type GitLabIssue = z.infer<typeof GitLabIssueSchema>;

// ─── GitLab API Client ───────────────────────────────────────────────────────

function gitlabHeaders() {
    const token = process.env.GITLAB_ACCESS_TOKEN;
    if (!token) throw new Error("GITLAB_ACCESS_TOKEN environment variable not set");
    return {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
    };
}

function gitlabBaseUrl() {
    return process.env.GITLAB_BASE_URL ?? "https://gitlab.com";
}

async function gitlabFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${gitlabBaseUrl()}/api/v4${path}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            ...gitlabHeaders(),
            ...(options?.headers ?? {}),
        },
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`GitLab API error ${res.status}: ${body}`);
    }

    return res.json() as T;
}

// ─── GitLab Service Methods ──────────────────────────────────────────────────

/**
 * Get a GitLab issue by project and issue IID (internal ID).
 */
export async function getGitLabIssue(
    projectId: number,
    issueIid: number
): Promise<GitLabIssue> {
    const raw = await gitlabFetch<unknown>(`/projects/${projectId}/issues/${issueIid}`);
    return GitLabIssueSchema.parse(raw);
}

/**
 * Create a new issue in a GitLab project.
 */
export async function createGitLabIssue(
    projectId: number,
    title: string,
    description?: string | null,
    labels?: string[]
): Promise<GitLabIssue> {
    const raw = await gitlabFetch<unknown>(`/projects/${projectId}/issues`, {
        method: "POST",
        body: JSON.stringify({
            title,
            description: description ?? "",
            labels: labels?.join(",") ?? "",
        }),
    });
    return GitLabIssueSchema.parse(raw);
}

/**
 * Close a GitLab issue.
 */
export async function closeGitLabIssue(
    projectId: number,
    issueIid: number
): Promise<GitLabIssue> {
    const raw = await gitlabFetch<unknown>(`/projects/${projectId}/issues/${issueIid}`, {
        method: "PUT",
        body: JSON.stringify({ state_event: "close" }),
    });
    return GitLabIssueSchema.parse(raw);
}

/**
 * Reopen a GitLab issue.
 */
export async function reopenGitLabIssue(
    projectId: number,
    issueIid: number
): Promise<GitLabIssue> {
    const raw = await gitlabFetch<unknown>(`/projects/${projectId}/issues/${issueIid}`, {
        method: "PUT",
        body: JSON.stringify({ state_event: "reopen" }),
    });
    return GitLabIssueSchema.parse(raw);
}

/**
 * Add a comment to a GitLab issue.
 */
export async function commentOnGitLabIssue(
    projectId: number,
    issueIid: number,
    body: string
): Promise<void> {
    await gitlabFetch(`/projects/${projectId}/issues/${issueIid}/notes`, {
        method: "POST",
        body: JSON.stringify({ body }),
    });
}

/**
 * Check if GitLab integration is configured.
 */
export function isGitLabConfigured(): boolean {
    return !!process.env.GITLAB_ACCESS_TOKEN;
}
