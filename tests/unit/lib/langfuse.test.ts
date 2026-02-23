import { langfuse, fetchLangfuseAPI } from '@/lib/langfuse';
import { langfuseErrorHandlers } from '../../msw/handlers/langfuse.handlers';
import { server } from '../../msw/server';

describe('langfuse client', () => {
    it('singleton: multiple imports return same instance', () => {
        // If we import it again it should be the strict same object reference
        const langfuse2 = require('@/lib/langfuse').langfuse;
        expect(langfuse).toBe(langfuse2);
    });
});

describe('fetchLangfuseAPI', () => {
    it('getTraces returns typed, paginated response', async () => {
        const response = await fetchLangfuseAPI('/api/public/v1/traces');
        expect(response).toBeDefined();
        expect(response.data.length).toBe(2);
        expect(response.meta.total).toBe(2);
    });

    it('getPrompt returns prompt with parsed variables', async () => {
        const response = await fetchLangfuseAPI('/api/public/v2/prompts/test-prompt');
        expect(response).toBeDefined();
        expect(response.name).toBe('test-prompt');
        expect(response.variables).toContain('context');
    });

    it('throws LangFuseApiError with status code on non-2xx response', async () => {
        server.use(langfuseErrorHandlers.unauthorized);
        await expect(fetchLangfuseAPI('/api/public/v1/traces')).rejects.toThrow(/Langfuse API Error: 401/);
    });
});
