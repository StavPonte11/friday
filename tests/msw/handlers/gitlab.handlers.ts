import { http, HttpResponse } from 'msw';

const BASE_URL = 'https://gitlab.com/api/v4';

export const gitlabHandlers = [
    http.post(`${BASE_URL}/projects/:id/merge_requests/:iid/notes`, async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({
            id: 101,
            body: (body as any).body,
            created_at: new Date().toISOString()
        }, { status: 201 });
    }),

    http.get(`${BASE_URL}/projects/:id/merge_requests/:iid`, () => {
        return HttpResponse.json({
            id: 42,
            iid: 7,
            state: 'merged',
            title: 'feat: add onboarding prompt'
        });
    }),
];

export const gitlabErrorHandlers = {
    networkError: http.post(`${BASE_URL}/*`, () => HttpResponse.error()),
    unauthorized: http.post(`${BASE_URL}/*`, () => HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })),
};
