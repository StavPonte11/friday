import { POST } from '@/app/api/webhooks/gitlab/route';
import { NextRequest } from 'next/server';
import { createGitLabMREvent } from '@/tests/fixtures/factories';

jest.mock('@/lib/env', () => ({
    env: {
        LANGFUSE_PUBLIC_KEY: 'test',
        LANGFUSE_SECRET_KEY: 'test',
        GITLAB_TOKEN: 'test',
        GITLAB_WEBHOOK_SECRET: 'test-secret',
        NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY: 'test',
    }
}));

describe('POST /api/webhooks/gitlab', () => {
    const SECRET = process.env.GITLAB_WEBHOOK_SECRET || 'secret';

    it('returns 401 when X-Gitlab-Token header is missing', async () => {
        const req = new NextRequest('http://localhost:3000/api/webhooks/gitlab', { method: 'POST' });
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('returns 401 when X-Gitlab-Token header is invalid', async () => {
        const req = new NextRequest('http://localhost:3000/api/webhooks/gitlab', {
            method: 'POST',
            headers: { 'x-gitlab-token': 'wrong-secret' },
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('returns 200 and ignores non-merge_request events', async () => {
        const payload = createGitLabMREvent({ object_kind: 'push' });
        const req = new NextRequest('http://localhost:3000/api/webhooks/gitlab', {
            method: 'POST',
            headers: { 'x-gitlab-token': SECRET },
            body: JSON.stringify(payload),
        });
        const res = await POST(req);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.data).toBe('Event ignored');
    });

    it('returns 200 and ignores MRs not targeting main branch', async () => {
        const payload = createGitLabMREvent({
            object_attributes: { ...createGitLabMREvent().object_attributes, target_branch: 'develop' }
        });
        const req = new NextRequest('http://localhost:3000/api/webhooks/gitlab', {
            method: 'POST',
            headers: { 'x-gitlab-token': SECRET },
            body: JSON.stringify(payload),
        });
        const res = await POST(req);
        expect(res.status).toBe(200);
    });

    it('returns 200 and ignores MRs with state !== merged', async () => {
        const payload = createGitLabMREvent({
            object_attributes: { ...createGitLabMREvent().object_attributes, state: 'opened' }
        });
        const req = new NextRequest('http://localhost:3000/api/webhooks/gitlab', {
            method: 'POST',
            headers: { 'x-gitlab-token': SECRET },
            body: JSON.stringify(payload),
        });
        const res = await POST(req);
        expect(res.status).toBe(200);
    });

    it('triggers prompt merge for valid merged MR event', async () => {
        const payload = createGitLabMREvent(); // targeting main, state merged
        const req = new NextRequest('http://localhost:3000/api/webhooks/gitlab', {
            method: 'POST',
            headers: { 'x-gitlab-token': SECRET },
            body: JSON.stringify(payload),
        });

        // Performance assertion
        const start = Date.now();
        const res = await POST(req);
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(5000);

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.data).toBe('Success');
    });
});
