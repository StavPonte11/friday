import { env } from "./env";

export async function fetchGitLabAPI(endpoint: string, options?: RequestInit) {
    const url = `${env.GITLAB_BASE_URL}/api/v4${endpoint}`;
    const headers = new Headers(options?.headers);
    headers.set("Private-Token", env.GITLAB_TOKEN);

    if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`GitLab API Error: ${response.status} ${errorData}`);
    }

    return response.json();
}

export async function postGitLabMRComment(projectId: string | number, mrIid: string | number, body: string) {
    return fetchGitLabAPI(`/projects/${projectId}/merge_requests/${mrIid}/notes`, {
        method: "POST",
        body: JSON.stringify({ body }),
    });
}
