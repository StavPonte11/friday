import { LangFuseTrace, LangFusePrompt, GitLabMREvent, MergeEvent } from '@/types';

export const createTrace = (overrides?: Partial<LangFuseTrace>): LangFuseTrace => ({
    id: 'trace-' + Math.random().toString(36).slice(2),
    name: 'test-trace',
    timestamp: new Date().toISOString(),
    userId: 'user-123',
    sessionId: 'session-abc',
    tags: [],
    status: 'success',
    latency: 1.2,
    totalTokens: 500,
    totalCost: 0.002,
    level: 'SUCCESS',
    input: { message: "hello" },
    output: { response: "hi" },
    spans: [],
    ...overrides,
});

export const createPrompt = (overrides?: Partial<LangFusePrompt>): LangFusePrompt => ({
    id: 'prompt-' + Math.random().toString(36).slice(2),
    name: 'test-prompt',
    labels: ['production'],
    version: 1,
    content: 'You are a helpful assistant. {{context}}',
    variables: ['context'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
});

export const createGitLabMREvent = (
    overrides?: Partial<GitLabMREvent>
): GitLabMREvent => ({
    object_kind: 'merge_request',
    project: { id: 1, name: 'agentlens', web_url: 'https://gitlab.com/org/agentlens' },
    object_attributes: {
        id: 42,
        iid: 7,
        title: 'feat: new onboarding prompt',
        state: 'merged',
        source_branch: 'feat/onboarding--system-prompt',
        target_branch: 'main',
        url: 'https://gitlab.com/org/agentlens/-/merge_requests/7',
        merged_at: new Date().toISOString(),
    },
    user: { name: 'Dev User', username: 'devuser' },
    ...overrides,
});
