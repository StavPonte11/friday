process.env.LANGFUSE_PUBLIC_KEY = 'pk-test-123';
process.env.LANGFUSE_SECRET_KEY = 'sk-test-123';
process.env.GITLAB_TOKEN = 'gl-test-123';
process.env.GITLAB_WEBHOOK_SECRET = 'test-secret';

process.on('unhandledRejection', (reason, promise) => {
    console.error('DEBUG: Unhandled Rejection at:', promise, 'reason:', reason);
});

import '@testing-library/jest-dom';
import 'jest-extended';
import { server } from './tests/msw/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
