import { http, HttpResponse } from 'msw';
import { createTrace, createPrompt } from '../../fixtures/factories';

const BASE_URL = 'https://cloud.langfuse.com';

export const langfuseHandlers = [
    http.get(`${BASE_URL}/api/public/v1/traces`, ({ request }) => {
        return HttpResponse.json({
            data: [createTrace(), createTrace({ id: 'trace-2', name: 'login-flow' })],
            meta: { page: 1, total: 2 }
        });
    }),

    http.get(`${BASE_URL}/api/public/v2/prompts`, ({ request }) => {
        return HttpResponse.json({
            data: [createPrompt(), createPrompt({ name: 'checkout-prompt', version: 2 })],
            meta: { page: 1, total: 2 }
        });
    }),

    http.get(`${BASE_URL}/api/public/v2/prompts/:name`, ({ params }) => {
        return HttpResponse.json({ ...createPrompt({ name: params.name as string }) });
    }),

    http.post(`${BASE_URL}/api/public/v2/prompts`, async ({ request }) => {
        const payload = await request.json() as any;
        return HttpResponse.json({
            ...createPrompt({ name: payload.name }),
            ...payload
        }, { status: 201 });
    }),
];

export const langfuseErrorHandlers = {
    networkError: http.get(`${BASE_URL}/*`, () => HttpResponse.error()),
    unauthorized: http.get(`${BASE_URL}/*`, () => HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })),
    notFound: http.get(`${BASE_URL}/api/public/v2/prompts/:name`, () => HttpResponse.json({ error: 'Not Found' }, { status: 404 })),
};
