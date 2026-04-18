import { http, HttpResponse } from 'msw';
import { createTrace, createPrompt } from '../../fixtures/factories';

const BASE_URL = 'https://cloud.langfuse.com';

export const langfuseHandlers = [
    http.get(`${BASE_URL}/api/public/v1/traces`, () => {
        return HttpResponse.json({
            data: [createTrace(), createTrace({ id: 'trace-2', name: 'login-flow' })],
            meta: { page: 1, total: 2 }
        });
    }),

    http.get(`${BASE_URL}/api/public/v2/prompts`, () => {
        return HttpResponse.json({
            data: [createPrompt(), createPrompt({ name: 'checkout-prompt', version: 2 })],
            meta: { page: 1, total: 2 }
        });
    }),

    // Use RegExp so it matches names containing slashes (e.g. feat/branch--prompt-name)
    http.get(new RegExp(`${BASE_URL}/api/public/v2/prompts/(.+)`), ({ request }) => {
        const url = new URL(request.url);
        // Extract everything after /api/public/v2/prompts/
        const name = url.pathname.replace('/api/public/v2/prompts/', '');
        return HttpResponse.json({ ...createPrompt({ name }) });
    }),

    http.post(`${BASE_URL}/api/public/v2/prompts`, async ({ request }) => {
        const payload = await request.json() as Record<string, unknown>;
        return HttpResponse.json({
            ...createPrompt({ name: payload.name as string }),
            ...payload
        }, { status: 201 });
    }),
];

export const langfuseErrorHandlers = {
    networkError: http.get(new RegExp(`${BASE_URL}/*`), () => HttpResponse.error()),
    unauthorized: http.get(new RegExp(`${BASE_URL}/*`), () => HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })),
    notFound: http.get(new RegExp(`${BASE_URL}/api/public/v2/prompts/(.+)`), () => HttpResponse.json({ error: 'Not Found' }, { status: 404 })),
};
