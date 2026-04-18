// Environment variables must be set before any imports that might read them
process.env.LANGFUSE_PUBLIC_KEY = 'pk-test-123';
process.env.LANGFUSE_SECRET_KEY = 'sk-test-123';
process.env.LANGFUSE_BASE_URL = 'https://cloud.langfuse.com';
process.env.GITLAB_TOKEN = 'gl-test-123';
process.env.GITLAB_WEBHOOK_SECRET = 'test-secret';
process.env.GITLAB_BASE_URL = 'https://gitlab.com';
// @ts-ignore
process.env.NODE_ENV = 'test';

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    console.error('DEBUG: Unhandled Rejection at:', promise, 'reason:', reason);
});
