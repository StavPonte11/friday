import { GET } from '@/app/api/traces/route';
import { NextRequest } from 'next/server';
import { server } from '../../msw/server';
import { langfuseErrorHandlers } from '../../msw/handlers/langfuse.handlers';

describe('GET /api/traces', () => {
    it('returns paginated data with correct meta envelope shape', async () => {
        const req = new NextRequest('http://localhost:3000/api/traces?page=1');
        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.data.length).toBe(2);
        expect(json.meta.total).toBe(2);
        expect(json.error).toBeNull();
    });

    it('handles LangFuse API errors gracefully — maps to 500', async () => {
        server.use(langfuseErrorHandlers.networkError);
        const req = new NextRequest('http://localhost:3000/api/traces?page=1');
        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(500);
        expect(json.error).toMatch(/Langfuse API Error/);
        expect(json.data).toBeNull();
    });
});
